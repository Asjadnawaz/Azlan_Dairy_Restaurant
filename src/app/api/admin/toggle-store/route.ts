import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { isAdminUser } from "@/lib/admin";

export async function POST(req: NextRequest) {
  try {
    // ── 1. Authorize the caller ──
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

    // ── 2. Validate payload ──
    const { is_active } = (await req.json()) as { is_active: boolean };

    if (typeof is_active !== "boolean") {
      return NextResponse.json(
        { error: "Invalid is_active value" },
        { status: 400 }
      );
    }

    // ── 3. Use admin client (bypasses RLS) to update settings ──
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("settings")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", 1)
      .select();

    if (error) {
      console.error("Failed to update store status:", error);
      return NextResponse.json(
        { error: "Failed to update settings in database", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      is_active,
      data,
    });
  } catch (err) {
    console.error("Toggle store error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
