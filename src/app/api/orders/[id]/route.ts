import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { isAdminUser } from "@/lib/admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = (await req.json()) as { status: string };

    if (!status) {
      return NextResponse.json(
        { error: "Missing status field" },
        { status: 400 }
      );
    }

    const validStatuses = [
      "pending",
      "preparing",
      "ready",
      "delivering",
      "completed",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Check authorization: Admin cookie OR Supabase auth user
    const cookieStore = await cookies();
    const adminCookie = cookieStore.get("admin_auth")?.value;

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isAuthorized =
      adminCookie === "true" || (user && isAdminUser(user));

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized: Admin privileges required" },
        { status: 403 }
      );
    }

    // Use admin client (service role) to bypass RLS for status update
    const admin = createAdminClient();

    const { data: order, error } = await admin
      .from("orders")
      .update({
        status,
        ...(status === "preparing" && { preparing_at: new Date().toISOString() }),
        ...(status === "ready" && { ready_at: new Date().toISOString() }),
        ...(status === "delivering" && { delivering_at: new Date().toISOString() }),
        ...(status === "completed" && { completed_at: new Date().toISOString() }),
        ...(status === "cancelled" && { cancelled_at: new Date().toISOString() }),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed updating order status:", error);
      return NextResponse.json(
        { error: "Failed to update order", detail: error.message },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (err) {
    console.error("Update order status error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
