import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { generateOrderConfirmationEmail } from "@/lib/email/order-confirmation";

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
  items: OrderLineItem[];
  subtotal: number;
  delivery_fee: number;
  delivery_distance_km?: number;
  delivery_coordinates?: { lat: number; lng: number };
  total: number;
  user_id?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateOrderBody;

    // Server-side validation
    const name = body.customer_name?.trim();
    const phone = body.customer_phone?.trim();
    const address = body.customer_address?.trim();

    if (!name || !phone || !address) {
      return NextResponse.json(
        { error: "Missing required fields: name, phone, address" },
        { status: 400 }
      );
    }
    if (phone.replace(/\D/g, "").length < 8) {
      return NextResponse.json(
        { error: "Invalid phone number" },
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

    // Verify store is active (kill-switch)
    const { data: settings } = await admin
      .from("settings")
      .select("is_active")
      .eq("id", 1)
      .single();

    if (settings && !settings.is_active) {
      return NextResponse.json(
        { error: "Store Closed. Please Try Again Later." },
        { status: 403 }
      );
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
    const lineItems = body.items.map((item) => ({
      order_id: order.id,
      item_id: item.id,
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
      // Order was created but items failed — log but don't fail the response
      // since the order ID is already generated
    }

    // --- Send Order Confirmation Email ---
    // Fire-and-forget: we don't block the response on email delivery.
    const customerEmail = user?.email;
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
