import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin";
import { revalidateSettings } from "@/lib/settings.server";
import {
  FORCE_OPEN_GRACE_MS,
  getStoreOpenStatus,
  toStoreStatusPayload,
  type StoreOpenMode,
} from "@/lib/store-hours";
import type { Settings } from "@/lib/supabase/database.types";

/**
 * The admin's control over whether the shop is open.
 *
 * Three modes rather than a boolean, because the old `is_active` flag could only
 * ever *close* the shop early — `getStoreOpenStatus` short-circuited on the
 * schedule, so there was no way to open up outside 7 PM–4 AM at all.
 *
 * `force_open` is deliberately not permanent. It carries `force_open_until`, and
 * this route is also the heartbeat that pushes that expiry forward while an admin
 * is actually watching the dashboard. Walk away (or sign out) and the next read of
 * the status retires it — see `readStoreStatusFresh`. That is what stops a
 * late-night force-open from leaving the shop open until morning.
 *
 * Accepted bodies:
 *   { mode: "auto" | "force_open" | "force_closed" }
 *   { heartbeat: true }          — extend a live force-open, no-op otherwise
 *   { retire: true }             — hand a live force-open back to the schedule
 *                                  (sign-out); leaves force_closed alone
 *   { is_active: boolean }       — legacy shape, mapped onto the modes
 */

export const dynamic = "force-dynamic";

type TogglePayload = {
  mode?: unknown;
  heartbeat?: unknown;
  retire?: unknown;
  is_active?: unknown;
};

function isMode(value: unknown): value is StoreOpenMode {
  return value === "auto" || value === "force_open" || value === "force_closed";
}

export async function POST(req: NextRequest) {
  try {
    // ── 1. Authorize the caller ──
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

    // ── 2. Work out what was asked for ──
    let body: TogglePayload;
    try {
      body = (await req.json()) as TogglePayload;
    } catch {
      return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: currentRow } = await admin
      .from("settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    const current = (currentRow as Settings | null) ?? null;

    const now = Date.now();
    const graceUntil = new Date(now + FORCE_OPEN_GRACE_MS).toISOString();

    let mode: StoreOpenMode;
    if (isMode(body.mode)) {
      mode = body.mode;
    } else if (body.heartbeat === true) {
      // A heartbeat never changes the mode — it only refreshes the grace on a
      // force-open that is already in effect. If the admin has since switched
      // back to auto (or another tab did), this must not silently re-open.
      const currentStatus = getStoreOpenStatus(current);
      if (currentStatus.mode !== "force_open") {
        return NextResponse.json({
          success: true,
          heartbeat: "ignored",
          reason: "not_force_open",
          status: toStoreStatusPayload(currentStatus),
        });
      }
      mode = "force_open";
    } else if (body.retire === true) {
      // Sign-out: hand the shop back to the schedule *only* if it was being held
      // open. A deliberate force_closed has to survive — signing out is not a
      // reason to start taking orders again.
      const currentStatus = getStoreOpenStatus(current);
      if (currentStatus.mode !== "force_open") {
        return NextResponse.json({
          success: true,
          retire: "ignored",
          reason: "not_force_open",
          status: toStoreStatusPayload(currentStatus),
        });
      }
      mode = "auto";
    } else if (typeof body.is_active === "boolean") {
      // Legacy callers: false meant "closed now", true meant "stop overriding".
      mode = body.is_active ? "auto" : "force_closed";
    } else {
      return NextResponse.json(
        {
          error:
            "Expected { mode }, { heartbeat: true }, { retire: true } or { is_active }",
        },
        { status: 400 }
      );
    }

    // ── 3. Write it ──
    // `is_active` is kept in step so anything still reading the old boolean —
    // and `readMode`'s pre-migration fallback — agrees with the new mode.
    const update = {
      open_mode: mode,
      force_open_until: mode === "force_open" ? graceUntil : null,
      is_active: mode !== "force_closed",
      updated_at: new Date().toISOString(),
    };

    const written = await admin.from("settings").update(update).eq("id", 1).select();
    const error = written.error;
    let data = written.data;

    if (error) {
      // The migration adding open_mode/force_open_until may not have been run
      // yet. Fall back to the boolean so the admin is never locked out of
      // closing the shop — but say so, because force-open cannot work without
      // the columns.
      console.warn(
        "Store toggle: falling back to is_active only —",
        error.message
      );
      const fallback = await admin
        .from("settings")
        .update({ is_active: update.is_active, updated_at: update.updated_at })
        .eq("id", 1)
        .select();

      if (fallback.error) {
        console.error("Failed to update store status:", fallback.error);
        return NextResponse.json(
          {
            error: "Failed to update settings in database",
            detail: fallback.error.message,
          },
          { status: 500 }
        );
      }

      data = fallback.data;
      revalidateSettings();
      return NextResponse.json({
        success: true,
        mode: update.is_active ? "auto" : "force_closed",
        degraded: "missing_columns",
        detail:
          "Saved as open/closed only. Run the 20260825_customer_flow migration to enable force-open.",
        status: toStoreStatusPayload(
          getStoreOpenStatus({ is_active: update.is_active })
        ),
        data,
      });
    }

    // The layout reads settings through a cached, cookie-free query, so the new
    // state has to be published explicitly or the next visitor sees the old one.
    revalidateSettings();

    const status = getStoreOpenStatus({ ...current, ...update });

    return NextResponse.json({
      success: true,
      mode,
      is_active: update.is_active,
      force_open_until: update.force_open_until,
      graceMs: FORCE_OPEN_GRACE_MS,
      status: toStoreStatusPayload(status),
      data,
    });
  } catch (err) {
    console.error("Toggle store error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
