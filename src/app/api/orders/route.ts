import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { generateOrderConfirmationEmail } from "@/lib/email/order-confirmation";
import { sanitizeText, sanitizePhone, isValidPakistanPhone } from "@/lib/sanitize";
import { getStoreOpenStatus } from "@/lib/store-hours";

interface OrderLineItem {
  id: string;
  name: string;
  price: number;
  image_path?: string;
  quantity: number;
}

interface CreateOrderBody {
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_note?: string;
  customer_email?: string;
  items: OrderLineItem[];
  subtotal: number;
  delivery_fee: number;
  delivery_distance_km?: number;
  delivery_coordinates?: { lat: number; lng: number };
  total: number;
  user_id?: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const numbersParam = searchParams.get("numbers");
    const phoneParam = searchParams.get("phone");

    const admin = createAdminClient();

    // Check user session
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let query = admin.from("orders").select(`
      *,
      order_items (
        id,
        name_snapshot,
        price_snapshot,
        quantity,
        line_total
      )
    `);

    if (user?.id) {
      query = query.eq("user_id", user.id);
    } else if (numbersParam) {
      const numbers = numbersParam
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);
      if (numbers.length === 0) {
        return NextResponse.json({ orders: [] });
      }
      query = query.in("order_number", numbers);
    } else if (phoneParam) {
      query = query.eq("customer_phone", phoneParam.trim());
    } else {
      return NextResponse.json({ orders: [] });
    }

    const { data: orders, error } = await query
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders: orders || [] });
  } catch (err) {
    console.error("Get orders exception:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateOrderBody;

    // Server-side sanitization and validation
    const name = sanitizeText(body.customer_name, 50);
    const phone = sanitizePhone(body.customer_phone);
    const address = sanitizeText(body.customer_address, 250);
    const note = sanitizeText(body.customer_note, 200);

    if (!name) {
      return NextResponse.json(
        { error: "Customer name is required (max 50 characters)" },
        { status: 400 }
      );
    }
    if (!isValidPakistanPhone(phone)) {
      return NextResponse.json(
        { error: "Valid 11-digit Pakistan phone number required (e.g. 03001234567)" },
        { status: 400 }
      );
    }
    if (!address) {
      return NextResponse.json(
        { error: "Delivery address is required (max 250 characters)" },
        { status: 400 }
      );
    }
    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: "Cart is empty" },
        { status: 400 }
      );
    }

    // Get authenticated user (for email + user_id linking)
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Use admin client (bypasses RLS) for all database operations
    const admin = createAdminClient();

    // Verify store is active & within operating hours (7:00 PM - 4:00 AM PKT)
    const { data: settings } = await admin
      .from("settings")
      .select("is_active")
      .eq("id", 1)
      .single();

    const storeStatus = getStoreOpenStatus(settings?.is_active ?? true);
    if (!storeStatus.isOpen) {
      const errorMsg =
        storeStatus.reason === "closed_by_admin"
          ? "Restaurant is currently paused for online orders. Please check back later."
          : "Restaurant is currently closed. Operating hours are 7:00 PM to 4:00 AM.";
      return NextResponse.json({ error: errorMsg }, { status: 403 });
    }

    // Generate order number: AD-XXXX
    const { data: lastOrder } = await admin
      .from("orders")
      .select("order_number")
      .order("placed_at", { ascending: false })
      .limit(1)
      .single();

    let nextNum = 1001;
    if (lastOrder?.order_number) {
      const match = lastOrder.order_number.match(/AD-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const orderNumber = `AD-${nextNum}`;

    // Insert order
    const orderInsert: Record<string, unknown> = {
      order_number: orderNumber,
      customer_name: name,
      customer_phone: phone,
      customer_address: address,
      customer_note: body.customer_note?.trim() || null,
      subtotal: body.subtotal,
      total: body.total,
      delivery_fee: body.delivery_fee,
      delivery_distance_km: body.delivery_distance_km ?? null,
      delivery_coordinates: body.delivery_coordinates ?? null,
      status: "pending",
      source: "website",
      placed_at: new Date().toISOString(),
    };

    if (user?.id) {
      orderInsert.user_id = user.id;
    }

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert(orderInsert)
      .select("id, order_number")
      .single();

    if (orderError || !order) {
      console.error("Failed to insert order:", orderError);
      return NextResponse.json(
        { error: "Failed to place order. Please try again.", detail: orderError?.message },
        { status: 500 }
      );
    }

    // Insert order line items
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const lineItems = body.items.map((item) => ({
      order_id: order.id,
      item_id: uuidRegex.test(item.id) ? item.id : null,
      name_snapshot: item.name,
      price_snapshot: item.price,
      quantity: item.quantity,
      line_total: item.price * item.quantity,
    }));

    const { error: itemsError } = await admin
      .from("order_items")
      .insert(lineItems);

    if (itemsError) {
      console.error("Failed to insert order items:", itemsError);
    }

    // --- Send Order Confirmation Email ---
    // Fire-and-forget: we don't block the response on email delivery.
    const customerEmail = body.customer_email || user?.email;
    if (customerEmail && order.id && order.order_number && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const emailHtml = generateOrderConfirmationEmail({
        customerName: name,
        orderNumber: order.order_number,
        orderId: order.id,
        items: body.items,
        subtotal: body.subtotal,
        deliveryFee: body.delivery_fee,
        total: body.total,
        deliveryAddress: address,
        customerPhone: phone,
        orderNote: body.customer_note,
      });

      resend.emails
        .send({
          from: "Azlan Fast Food <onboarding@resend.dev>",
          to: customerEmail,
          subject: `✅ Order Confirmed: ${order.order_number} – Azlan Fast Food`,
          html: emailHtml,
        })
        .then(({ error }) => {
          if (error) console.error("Resend email error:", error);
          else console.log(`📧 Confirmation email sent to ${customerEmail} for order ${order.order_number}`);
        })
        .catch((err: unknown) => console.error("Email send exception:", err));
    }
    // ----------------------------------------

    return NextResponse.json({
      success: true,
      order_id: order.id,
      order_number: order.order_number,
    });
  } catch (err) {
    console.error("Create order exception:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
