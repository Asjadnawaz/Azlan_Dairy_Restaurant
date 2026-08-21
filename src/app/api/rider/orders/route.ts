import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncUserProfile } from "@/lib/auth-role";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await syncUserProfile(user);
    if (role !== "rider" && role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();

    // 1. Get or create rider record
    let { data: rider } = await admin
      .from("riders")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!rider) {
      const riderName =
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        user.email?.split("@")[0] ||
        "Rider";
      const riderPhone = (user.user_metadata?.phone as string) || "03000000000";

      const { data: newRider } = await admin
        .from("riders")
        .upsert(
          { user_id: user.id, name: riderName, phone: riderPhone, status: "available" },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      rider = newRider;
    }

    if (!rider) {
      return NextResponse.json({
        rider: null,
        orders: [],
        itemsMap: {},
      });
    }

    // 2. Fetch ONLY orders explicitly assigned to this rider
    const { data: orders, error: ordersErr } = await admin
      .from("orders")
      .select("*")
      .or(`rider_id.eq.${rider.id},rider_id.eq.${rider.user_id}`)
      .order("placed_at", { ascending: false })
      .limit(50);

    if (ordersErr) {
      console.error("Error fetching rider orders:", ordersErr);
      return NextResponse.json({ error: ordersErr.message }, { status: 500 });
    }

    const orderList = orders || [];

    // 3. Dynamic Rider Status Synchronization:
    // If rider has ANY active/in-progress order, guarantee status is 'busy'.
    // If rider has 0 active orders and was 'busy', switch back to 'available'.
    const activeOrders = orderList.filter((o) =>
      ["picked_up", "delivering", "out_for_delivery", "preparing", "ready"].includes(o.status)
    );

    let targetStatus = rider.status;
    if (activeOrders.length > 0) {
      targetStatus = "busy";
    } else if (rider.status === "busy" && activeOrders.length === 0) {
      targetStatus = "available";
    }

    if (targetStatus !== rider.status) {
      await admin
        .from("riders")
        .update({ status: targetStatus, updated_at: new Date().toISOString() })
        .eq("id", rider.id);
      rider.status = targetStatus;
    }

    // 4. Fetch order items for these orders
    const orderIds = orderList.map((o) => o.id);
    const itemsMap: Record<string, unknown[]> = {};
    if (orderIds.length > 0) {
      const { data: items } = await admin
        .from("order_items")
        .select("*")
        .in("order_id", orderIds);

      if (items) {
        items.forEach((it) => {
          if (!itemsMap[it.order_id]) itemsMap[it.order_id] = [];
          itemsMap[it.order_id].push(it);
        });
      }
    }

    return NextResponse.json({
      rider,
      orders: orderList,
      itemsMap,
    });
  } catch (err) {
    console.error("Rider orders API error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
