import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin";
import { MENU_ITEMS } from "@/data/menu-data";
import { getErrorMessage } from "@/lib/utils";

async function verifyAdminAuth() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return Boolean(user && isAdminUser(user));
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
    const { data: existingItems, error } = await admin
      .from("items")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If DB contains less than full menu, seed DB with full MENU_ITEMS
    if (!existingItems || existingItems.length < 50) {
      console.log("Seeding items table with full MENU_ITEMS...");
      const formatted = MENU_ITEMS.map((item) =>
        Object.fromEntries(
          Object.entries(item).filter(([key]) => key !== "id")
        )
      );
      const { data: seeded, error: seedError } = await admin
        .from("items")
        .upsert(formatted, { onConflict: "slug" })
        .select()
        .order("sort_order", { ascending: true });

      if (seedError) {
        console.error("Failed seeding items:", seedError);
        return NextResponse.json({ error: seedError.message }, { status: 500 });
      }
      return NextResponse.json({ items: seeded });
    }

    return NextResponse.json({ items: existingItems });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Server error") },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const isAuthorized = await verifyAdminAuth();
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized: Admin privileges required" },
        { status: 403 }
      );
    }

    const body = (await req.json()) as {
      id?: unknown;
      price?: unknown;
      is_available?: unknown;
    };
    const { id, price, is_available } = body;

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof price === "number") {
      if (price < 0) {
        return NextResponse.json({ error: "Price cannot be negative" }, { status: 400 });
      }
      updates.price = price;
    }

    if (typeof is_available === "boolean") {
      updates.is_available = is_available;
    }

    const admin = createAdminClient();
    const { data: updatedItem, error } = await admin
      .from("items")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, item: updatedItem });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Server error") },
      { status: 500 }
    );
  }
}
