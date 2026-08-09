import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { isAdminUser } from "@/lib/admin";

async function verifyAdminAuth() {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("admin_auth")?.value;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return adminCookie === "true" || (user && isAdminUser(user));
}

export async function GET() {
  try {
    const isAuthorized = await verifyAdminAuth();
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized: Admin privileges required" },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    const { data: orders, error: ordersError } = await admin
      .from("orders")
      .select("*")
      .order("placed_at", { ascending: false })
      .limit(50);

    if (ordersError) {
      return NextResponse.json(
        { error: "Failed to fetch orders", detail: ordersError.message },
        { status: 500 }
      );
    }

    const orderIds = (orders ?? []).map((o) => o.id);

    let lineItems: any[] = [];
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
  } catch (err) {
    console.error("Fetch admin orders error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const isAuthorized = await verifyAdminAuth();
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized: Admin privileges required" },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    // 1. Delete all order items first to satisfy foreign key constraints
    const { error: itemsError } = await admin
      .from("order_items")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (itemsError) {
      console.error("Failed deleting order items:", itemsError);
      return NextResponse.json(
        { error: "Failed to clear order items", detail: itemsError.message },
        { status: 500 }
      );
    }

    // 2. Delete all orders
    const { error: ordersError } = await admin
      .from("orders")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (ordersError) {
      console.error("Failed deleting orders:", ordersError);
      return NextResponse.json(
        { error: "Failed to clear orders", detail: ordersError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "All orders cleared successfully.",
    });
  } catch (err) {
    console.error("Clear orders error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
