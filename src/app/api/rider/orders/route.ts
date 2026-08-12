import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin";
import { getErrorMessage } from "@/lib/utils";
import type { OrderItem } from "@/lib/supabase/database.types";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const riderAuth = cookieStore.get("rider_auth")?.value === "true";

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const isUserAdmin = Boolean(user && isAdminUser(user));

    if (!riderAuth && !isUserAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Fetch orders with status 'delivering' or 'ready' or recently 'completed'
    const { data: orders, error } = await admin
      .from("orders")
      .select("*")
      .in("status", ["delivering", "ready", "completed"])
      .order("placed_at", { ascending: false })
      .limit(60);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const orderIds = (orders ?? []).map((o) => o.id);
    let lineItems: OrderItem[] = [];
    if (orderIds.length > 0) {
      const { data: itemsData } = await admin
        .from("order_items")
        .select("*")
        .in("order_id", orderIds);
      lineItems = itemsData ?? [];
    }

    return NextResponse.json({
      orders: orders ?? [],
      lineItems,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Server error") },
      { status: 500 }
    );
  }
}
