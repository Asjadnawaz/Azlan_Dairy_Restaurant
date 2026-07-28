import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

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

    const validStatuses = ["pending", "preparing", "ready", "delivering", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Update order status
    const { data: order, error } = await supabase
      .from("orders")
      .update({
        status,
        // Update timestamps based on status
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
