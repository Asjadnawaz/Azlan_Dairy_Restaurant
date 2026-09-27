import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateOrderConfirmationEmail, sendEmail } from "@/lib/email";
import { sanitizeText, sanitizePhone, isValidPakistanPhone } from "@/lib/sanitize";
import { getStoreOpenStatus, formatCountdown } from "@/lib/store-hours";
import { computeTotals } from "@/lib/cart-pricing";

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
  coupon_code?: string;
  user_id?: string;
}

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FIRST_ORDER_NUMBER = 1001;

/**
 * The next `AD-1234`.
 *
 * There is no sequence behind this, so it is derived from the numbers already
 * issued — which means two simultaneous checkouts can read the same one. The
 * `attempt` offset lets the caller walk past a collision instead of failing the
 * order; the unique constraint on `order_number` is what makes that safe.
 *
 * The maximum is taken numerically over the most recent rows rather than from
 * `order by placed_at desc limit 1`, which handed out a duplicate whenever a
 * row was backdated or inserted by hand. Sorting by `order_number` itself would
 * be no better — as text, `AD-9999` sorts above `AD-10000`.
 */
async function nextOrderNumber(
  admin: ReturnType<typeof createAdminClient>,
  attempt: number
): Promise<string> {
  const { data } = await admin
    .from("orders")
    .select("order_number")
    .like("order_number", "AD-%")
    .order("created_at", { ascending: false })
    .limit(100);

  let highest = FIRST_ORDER_NUMBER - 1;
  for (const row of (data ?? []) as { order_number: string }[]) {
    const match = row.order_number?.match(/^AD-(\d+)$/);
    if (match) {
      highest = Math.max(highest, parseInt(match[1], 10));
    }
  }
  return `AD-${highest + 1 + attempt}`;
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
        item_id,
        name_snapshot,
        price_snapshot,
        quantity,
        line_total
      )
    `);

    // Order numbers are `AD-1234`; anything else is not one, and letting it
    // through would splice arbitrary text into the PostgREST filter below.
    const numbers = (numbersParam ?? "")
      .split(",")
      .map((n) => n.trim())
      .filter((n) => /^[A-Za-z0-9-]{1,20}$/.test(n))
      .slice(0, 10);

    if (user?.id && numbers.length > 0) {
      // A signed-in customer usually has guest orders on this device too — from
      // before they made an account, or from a checkout they did not sign in
      // for. Testing `user_id` first meant /orders never showed those, and the
      // page silently fell back to its localStorage copy.
      const inList = numbers.map((n) => `"${n}"`).join(",");
      query = query.or(`user_id.eq.${user.id},order_number.in.(${inList})`);
    } else if (user?.id) {
      query = query.eq("user_id", user.id);
    } else if (numbers.length > 0) {
      query = query.in("order_number", numbers);
    } else if (phoneParam) {
      query = query.eq("customer_phone", sanitizePhone(phoneParam));
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

    // Verify the store is open — schedule, or whatever the admin has forced.
    const { data: settings } = await admin
      .from("settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    const storeStatus = getStoreOpenStatus(settings ?? null);
    if (!storeStatus.isOpen) {
      const errorMsg =
        storeStatus.reason === "temporary_closure"
          ? (storeStatus.temporaryClosureMessage ??
              "Store is temporarily closed for maintenance shutdown. Online orders will resume on October 12.")
          : storeStatus.reason === "closed_by_admin"
            ? "We have paused online orders for now. Please check back shortly."
            : `We are closed right now — we open in ${formatCountdown(
                storeStatus.minutesUntilOpen
              )}. Delivery hours are ${storeStatus.operatingHoursText}.`;
      return NextResponse.json({ error: errorMsg }, { status: 403 });
    }

    // Re-derive the money from the line items. The browser sends `subtotal`,
    // `total` and a coupon code, but a request is just text — trusting the
    // posted total meant anyone could pay Rs. 1 for a family bucket.
    const totals = computeTotals({
      items: body.items.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      deliveryFee: body.delivery_fee,
      couponCode: body.coupon_code ?? null,
      isPickup: /\[PICKUP\]/i.test(body.customer_note ?? ""),
    });

    // The prices themselves still come from the request, so confirm them
    // against the menu before charging anyone.
    const menuIds = body.items
      .map((item) => item.id)
      .filter((id) => uuidRegex.test(id));

    const validMenuIds = new Set<string>();

    if (menuIds.length > 0) {
      const { data: menuRows } = await admin
        .from("items")
        .select("id, price")
        .in("id", menuIds);

      const livePrices = new Map(
        ((menuRows ?? []) as { id: string; price: number }[]).map((row) => [
          row.id,
          row.price,
        ])
      );

      for (const row of menuRows ?? []) {
        validMenuIds.add(row.id);
      }

      const mismatched = body.items.find(
        (item) =>
          livePrices.has(item.id) &&
          Math.round(livePrices.get(item.id)!) !== Math.round(item.price)
      );

      if (mismatched) {
        return NextResponse.json(
          {
            error:
              "Some prices changed while you were ordering. Please refresh your basket and try again.",
          },
          { status: 409 }
        );
      }
    }

    // Preserve customer email in order note if provided
    const customerEmail = body.customer_email || user?.email;
    let finalNote = note;
    if (customerEmail && !note?.includes("[Email:")) {
      finalNote = `${note ? note + " " : ""}[Email: ${customerEmail}]`;
    }

    // Insert order, retrying the number on a collision (see nextOrderNumber).
    const orderInsert: Record<string, unknown> = {
      customer_name: name,
      customer_phone: phone,
      customer_address: address,
      customer_note: finalNote || null,
      subtotal: totals.subtotal,
      discount: totals.discount,
      total: totals.total,
      delivery_fee: totals.deliveryFee,
      delivery_distance_km: body.delivery_distance_km ?? null,
      delivery_coordinates: body.delivery_coordinates ?? null,
      status: "pending",
      source: "website",
      placed_at: new Date().toISOString(),
    };

    if (user?.id) {
      orderInsert.user_id = user.id;
    }

    let order: { id: string; order_number: string } | null = null;
    let orderError: { message: string; code?: string } | null = null;

    for (let attempt = 0; attempt < 5 && !order; attempt++) {
      const orderNumber = await nextOrderNumber(admin, attempt);
      const { data, error } = await admin
        .from("orders")
        .insert({ ...orderInsert, order_number: orderNumber })
        .select("id, order_number")
        .single();

      if (!error) {
        order = data as { id: string; order_number: string };
        break;
      }
      orderError = error;
      // 23505 = unique violation on order_number: two checkouts read the same
      // last number. Anything else is not going to fix itself by retrying.
      if (error.code !== "23505") break;
    }

    if (!order) {
      console.error("Failed to insert order:", orderError);
      return NextResponse.json(
        { error: "Failed to place order. Please try again.", detail: orderError?.message },
        { status: 500 }
      );
    }

    // Insert order line items
    // Only pass item_id if it's a valid ID from the items table; otherwise null prevents FK violations
    const lineItems = body.items.map((item) => ({
      order_id: order!.id,
      item_id: validMenuIds.has(item.id) ? item.id : null,
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
      // Clean up orphaned order row to avoid empty orders in admin dashboard
      await admin.from("orders").delete().eq("id", order.id);
      return NextResponse.json(
        { error: "Failed to record order items. Please try again.", detail: itemsError.message },
        { status: 500 }
      );
    }

    // --- Send Order Confirmation Email (fire-and-forget) ---
    // Don't await — the customer should get their response immediately.
    // Email errors are logged but never block the order.
    if (customerEmail && order.id && order.order_number) {
      const emailOrderNumber = order.order_number;
      const emailOrderId = order.id;
      void (async () => {
        try {
          const emailHtml = generateOrderConfirmationEmail({
            customerName: name,
            orderNumber: emailOrderNumber,
            orderId: emailOrderId,
            items: body.items,
            subtotal: totals.subtotal,
            deliveryFee: totals.deliveryFee,
            total: totals.total,
            deliveryAddress: address,
            customerPhone: phone,
            orderNote: note,
          });

          await sendEmail({
            to: customerEmail,
            subject: `Order Confirmed: ${emailOrderNumber} – Azlan Fast Food`,
            html: emailHtml,
          });
        } catch (emailErr) {
          console.error("Order confirmation email exception:", emailErr);
        }
      })();
    }
    // ----------------------------------------

    return NextResponse.json({
      success: true,
      order_id: order.id,
      order_number: order.order_number,
      subtotal: totals.subtotal,
      discount: totals.discount,
      delivery_fee: totals.deliveryFee,
      total: totals.total,
      coupon: totals.coupon?.code ?? null,
    });
  } catch (err) {
    console.error("Create order exception:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
