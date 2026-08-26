import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { fetchAdminStats } from "@/lib/admin-stats.server";

export const dynamic = "force-dynamic";

/**
 * The dashboard's aggregate refresh. The initial load is seeded by the admin
 * server page instead of this route — see `fetchAdminStats`, which both share —
 * so this only runs when realtime activity coalesces into a refresh or the admin
 * hits the refresh control.
 */
export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdminUser(user)) {
      return NextResponse.json(
        { error: "Unauthorized: Admin privileges required" },
        { status: 403 }
      );
    }

    const result = await fetchAdminStats();
    return NextResponse.json(result);
  } catch (err) {
    console.error("Admin stats error:", err);
    return NextResponse.json(
      {
        error: "Failed to load statistics",
        detail: err instanceof Error ? err.message : undefined,
      },
      { status: 500 }
    );
  }
}
