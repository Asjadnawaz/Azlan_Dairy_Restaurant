import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { isAdminUser } from "@/lib/admin";
import { syncUserProfile } from "@/lib/auth-role";
import { Resend } from "resend";
import { generateDeliveryReceiptEmail } from "@/lib/email/delivery-receipt";
import type { OrderItem } from "@/lib/supabase/database.types";

export async function GET(
  _req: NextRequest,
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
        name_snapshot,
        price_snapshot,
        quantity,
        line_total
      )
    `);

    const { data: order, error } = isUuid
      ? await query.eq("id", id).maybeSingle()
      : await query.ilike("order_number", id).maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
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
    const { status, rider_id, rider_note } = body as {
      status?: string;
      rider_id?: string | null;
      rider_note?: string | null;
    };

    if (!status && rider_id === undefined && rider_note === undefined) {
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
      if (finalStatus === "cancelled") updateData.cancelled_at = new Date().toISOString();
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
    if ((status === "delivered" || status === "completed") && process.env.RESEND_API_KEY) {
      try {
        let customerEmail: string | undefined;
        if (order.user_id) {
          const { data: userData } = await admin.auth.admin.getUserById(order.user_id);
          customerEmail = userData?.user?.email;
        }

        if (customerEmail) {
          const { data: items } = await admin
            .from("order_items")
            .select("*")
            .eq("order_id", order.id);

          const resend = new Resend(process.env.RESEND_API_KEY);
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

          resend.emails
            .send({
              from: "Azlan Fast Food <onboarding@resend.dev>",
              to: customerEmail,
              subject: `🎉 Order Delivered: ${order.order_number} – Azlan Fast Food`,
              html: emailHtml,
            })
            .then(({ error: resendErr }) => {
              if (resendErr) console.error("Delivery receipt email error:", resendErr);
              else console.log(`📧 Delivery receipt email sent to ${customerEmail}`);
            })
            .catch((err) => console.error("Delivery receipt email exception:", err));
        }
      } catch (emailErr) {
        console.warn("Could not send delivery email:", emailErr);
      }
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
