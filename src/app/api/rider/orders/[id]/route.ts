import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin";
import { getErrorMessage } from "@/lib/utils";
import type { OrderStatus } from "@/lib/supabase/database.types";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const { status } = (await req.json()) as { status?: unknown };

    if (!id || !status) {
      return NextResponse.json(
        { error: "Order ID and status are required" },
        { status: 400 }
      );
    }

    const validStatuses: OrderStatus[] = ["delivering", "completed"];
    if (typeof status !== "string" || !validStatuses.includes(status as OrderStatus)) {
      return NextResponse.json(
        { error: "Invalid status transition for rider" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "delivering") {
      updates.delivering_at = new Date().toISOString();
    } else if (status === "completed") {
      updates.completed_at = new Date().toISOString();
    }

    const admin = createAdminClient();
    const { data: updatedOrder, error } = await admin
      .from("orders")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Server error") },
      { status: 500 }
    );
  }
}
