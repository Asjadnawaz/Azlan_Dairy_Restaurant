import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { isAdminUser } from "@/lib/admin";
import { syncUserProfile } from "@/lib/auth-role";
import { generateDeliveryReceiptEmail, generateOrderCancellationEmail, sendEmail } from "@/lib/email";
import type { OrderItem } from "@/lib/supabase/database.types";

/**
 * Robust helper to resolve customer email address from order details,
 * attached profile, auth user, or order note.
 */
async function resolveCustomerEmail(
  admin: ReturnType<typeof createAdminClient>,
  order: { user_id?: string | null; customer_phone?: string | null; customer_note?: string | null },
  directEmail?: string | null
): Promise<string | undefined> {
  if (directEmail && directEmail.includes("@")) {
    return directEmail.trim();
  }

  // 1. Check order note for [Email: ...] or regex email match
  if (order.customer_note) {
    const emailTagMatch = order.customer_note.match(/\[(?:Email|EMAIL):\s*([^\]]+)\]/i);
    if (emailTagMatch && emailTagMatch[1].includes("@")) {
      return emailTagMatch[1].trim();
    }
    const generalEmailMatch = order.customer_note.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (generalEmailMatch) {
      return generalEmailMatch[0].trim();
    }
  }

  // 2. Direct user_id via Supabase Auth
  if (order.user_id) {
    try {
      const { data: userData } = await admin.auth.admin.getUserById(order.user_id);
      if (userData?.user?.email) return userData.user.email;
    } catch {
      // ignore
    }
  }

  // 3. Match customer phone in profiles
  if (order.customer_phone) {
    try {
      const cleanPhone = order.customer_phone.replace(/\D/g, "");
      if (cleanPhone) {
        const { data: profiles } = await admin
          .from("profiles")
          .select("id, phone")
          .limit(20);

        const matchedProfile = profiles?.find(
          (p) => p.phone && p.phone.replace(/\D/g, "") === cleanPhone
        );

        if (matchedProfile?.id) {
          const { data: uData } = await admin.auth.admin.getUserById(matchedProfile.id);
          if (uData?.user?.email) return uData.user.email;
        }
      }
    } catch {
      // ignore
    }
  }

  return undefined;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = createAdminClient();

    const isUuid = /^[0-9a-f-]{36}$/i.test(id);
    const query = admin.from("orders").select(`
      *,
      order_items (
        id,
        item_id,
        name_snapshot,
        price_snapshot,
        quantity,
        line_total,
        sort_order
      )
    `);

    const { data: order, error } = isUuid
      ? await query.eq("id", id).maybeSingle()
      : await query.ilike("order_number", id).maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Order numbers are sequential, so `AD-1041` is guessable, and this response
    // carries a name, a phone number and an address. A uuid is unguessable and
    // stays open (that is what the tracking page polls); an order-number lookup
    // has to bring the last four digits of the phone on the order, the same gate
    // the page itself uses.
    if (!isUuid) {
      const supplied = (new URL(req.url).searchParams.get("p") ?? "").replace(/\D/g, "");
      const expected = (order.customer_phone ?? "").replace(/\D/g, "").slice(-4);
      if (!expected || supplied.slice(-4) !== expected) {
        return NextResponse.json(
          { error: "Verification required" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ success: true, order });
  } catch (err) {
    console.error("Fetch order error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, rider_id, rider_note, cancellation_reason, customer_email } = body as {
      status?: string;
      rider_id?: string | null;
      rider_note?: string | null;
      cancellation_reason?: string | null;
      customer_email?: string | null;
    };

    if (
      !status &&
      rider_id === undefined &&
      rider_note === undefined &&
      cancellation_reason === undefined
    ) {
      return NextResponse.json(
        { error: "Missing fields to update" },
        { status: 400 }
      );
    }

    const validStatuses = [
      "pending",
      "preparing",
      "ready",
      "picked_up",
      "out_for_delivery",
      "delivering",
      "delivered",
      "completed",
      "cancelled",
    ];

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Authorization check: Admin OR Rider
    const cookieStore = await cookies();
    const adminCookie = cookieStore.get("admin_auth")?.value;

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let isAuthorized = adminCookie === "true";
    if (!isAuthorized && user) {
      const dbRole = await syncUserProfile(user);
      if (dbRole === "admin" || dbRole === "rider" || isAdminUser(user)) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized: Admin or Rider privileges required" },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    // Prepare update payload
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (cancellation_reason !== undefined) {
      updateData.cancellation_reason = cancellation_reason;
    }

    if (status) {
      // Map frontend values to postgres enum values
      let finalStatus = status;
      if (status === "out_for_delivery") finalStatus = "delivering";
      if (status === "delivered") finalStatus = "completed";
      
      updateData.status = finalStatus;
      
      if (finalStatus === "preparing") updateData.preparing_at = new Date().toISOString();
      if (finalStatus === "ready") updateData.ready_at = new Date().toISOString();
      if (finalStatus === "picked_up") updateData.picked_up_at = new Date().toISOString();
      if (finalStatus === "delivering") updateData.delivering_at = new Date().toISOString();
      if (finalStatus === "delivered" || finalStatus === "completed") updateData.completed_at = new Date().toISOString();
      if (finalStatus === "cancelled") {
        updateData.cancelled_at = new Date().toISOString();
        if (cancellation_reason) updateData.cancellation_reason = cancellation_reason;
      }
    }

    // Lookup current logged in rider profile if user is authenticated
    let currentRiderId: string | null = null;
    let currentRiderUserId: string | null = null;
    if (user) {
      const { data: rRecord } = await admin
        .from("riders")
        .select("id, user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (rRecord) {
        currentRiderId = rRecord.id;
        currentRiderUserId = rRecord.user_id;
      }
    }

    if (rider_id !== undefined) {
      updateData.rider_id = rider_id;
    } else if (currentRiderId && (status === "picked_up" || status === "out_for_delivery" || status === "delivering")) {
      updateData.rider_id = currentRiderId;
    }

    if (rider_note !== undefined) {
      updateData.rider_note = rider_note;
    }

    const { data: order, error } = await admin
      .from("orders")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error || !order) {
      console.error("Failed updating order:", error);
      return NextResponse.json(
        { error: "Failed to update order", detail: error?.message },
        { status: 500 }
      );
    }

    // Manage rider status (busy / available)
    const effectiveRiderId = order.rider_id || rider_id || currentRiderId || currentRiderUserId;
    if (effectiveRiderId) {
      if (status === "picked_up" || status === "out_for_delivery" || status === "delivering") {
        await admin
          .from("riders")
          .update({ status: "busy", updated_at: new Date().toISOString() })
          .or(`id.eq.${effectiveRiderId},user_id.eq.${effectiveRiderId}`);
      } else if (status === "delivered" || status === "completed" || status === "cancelled") {
        // Check if rider has any other active orders assigned
        const { data: remainingActive } = await admin
          .from("orders")
          .select("id")
          .or(`rider_id.eq.${effectiveRiderId},rider_id.eq.${currentRiderUserId || effectiveRiderId}`)
          .in("status", ["picked_up", "delivering", "out_for_delivery", "preparing", "ready"])
          .neq("id", id);

        if (!remainingActive || remainingActive.length === 0) {
          await admin
            .from("riders")
            .update({ status: "available", updated_at: new Date().toISOString() })
            .or(`id.eq.${effectiveRiderId},user_id.eq.${effectiveRiderId}`);
        }
      }
    }

    // Trigger Delivery Receipt Email if status reached 'delivered' or 'completed'
    if (status === "delivered" || status === "completed") {
      void (async () => {
        try {
          const customerEmail = await resolveCustomerEmail(admin, order, customer_email);

          if (customerEmail) {
            const { data: items } = await admin
              .from("order_items")
              .select("*")
              .eq("order_id", order.id);

            const emailHtml = generateDeliveryReceiptEmail({
              customerName: order.customer_name,
              orderNumber: order.order_number,
              orderId: order.id,
              items: (items as OrderItem[]) || [],
              subtotal: order.subtotal,
              deliveryFee: order.delivery_fee,
              total: order.total,
              deliveryAddress: order.customer_address,
              customerPhone: order.customer_phone,
            });

            await sendEmail({
              to: customerEmail,
              subject: `Order Delivered: ${order.order_number} – Azlan Fast Food`,
              html: emailHtml,
            });
          }
        } catch (emailErr) {
          console.warn("Could not send delivery email:", emailErr);
        }
      })();
    }

    // Trigger Order Cancellation Email if status is 'cancelled'
    if (status === "cancelled") {
      void (async () => {
        try {
          const customerEmail = await resolveCustomerEmail(admin, order, customer_email);

          if (customerEmail) {
            const { data: items } = await admin
              .from("order_items")
              .select("*")
              .eq("order_id", order.id);

            const emailHtml = generateOrderCancellationEmail({
              customerName: order.customer_name,
              orderNumber: order.order_number,
              orderId: order.id,
              cancellationReason: order.cancellation_reason || cancellation_reason || null,
              items: (items as OrderItem[]) || [],
              total: order.total,
            });

            await sendEmail({
              to: customerEmail,
              subject: `Order Cancelled: ${order.order_number} – Azlan Fast Food`,
              html: emailHtml,
            });
          }
        } catch (emailErr) {
          console.warn("Could not send cancellation email:", emailErr);
        }
      })();
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (err) {
    console.error("Update order error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
