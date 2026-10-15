import { cache } from "react";
import { unstable_cache, revalidateTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getStoreOpenStatus,
  toStoreStatusPayload,
  type StoreStatusPayload,
  type StoreStatusResult,
} from "@/lib/store-hours";
import type { Settings } from "@/lib/supabase/database.types";
import { hasSupabaseEnv, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * Shop settings, read once and cached. **Server-only** — the `.server.ts`
 * suffix and the `next/cache` import keep it out of client bundles; do not
 * import it from a `"use client"` file.
 *
 * The root layout used to read `settings` through the cookie-bound server
 * client on every request, which made every page in the site dynamic — the
 * single biggest drag on first paint. The read here is cookie-free and wrapped
 * in `unstable_cache`, so pages can be prerendered; the admin's store toggle
 * calls `revalidateSettings()` and the change is visible immediately, and the
 * browser gets live updates from the `settings` realtime channel anyway
 * (see src/hooks/use-store-status.ts).
 *
 * `cacheComponents` is off in this project, so this is the previous-model
 * caching API (unstable_cache + revalidateTag) rather than `use cache`.
 */

export const SETTINGS_CACHE_TAG = "azlan-settings";

/** How long a settings read may be stale, absent an explicit revalidate. */
const SETTINGS_TTL_SECONDS = 60;

/** Anon key, no cookies — required for the read to be cacheable. */
function createPublicClient() {
  return createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const loadSettings = unstable_cache(
  async (): Promise<Settings | null> => {
    // No .env (fresh clone, CI preview): fall back to the bundled defaults
    // instead of throwing during prerender.
    if (!hasSupabaseEnv()) return null;
    const { data, error } = await createPublicClient()
      .from("settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("Failed to read settings:", error.message);
      return null;
    }
    return (data as Settings | null) ?? null;
  },
  ["azlan-settings-row"],
  { tags: [SETTINGS_CACHE_TAG], revalidate: SETTINGS_TTL_SECONDS }
);

/**
 * Cached settings, deduplicated within a single render pass. Safe to call from
 * as many server components as you like — the layout and the page both do.
 */
export const getSettings = cache(async (): Promise<Settings | null> => loadSettings());

/** Drop the cached settings — call after any write to the row. */
export function revalidateSettings(): void {
  // Next 16 deprecated the single-argument form. `{ expire: 0 }` expires the tag
  // immediately, which is what "the admin just opened the shop" needs —
  // `profile: "max"` would serve the stale *closed* state to the next visitor.
  revalidateTag(SETTINGS_CACHE_TAG, { expire: 0 });
}

/* -------------------------------------------------------------------------- */
/* Store status                                                               */
/* -------------------------------------------------------------------------- */

/** Status for server rendering, from the cached settings. */
export async function getStoreStatus(): Promise<StoreStatusPayload> {
  return toStoreStatusPayload(getStoreOpenStatus(await getSettings()));
}

/**
 * Fresh, authoritative status — and the place the 30-minute force-open lapse is
 * actually enforced.
 *
 * There is no cron in this project, and by the time a force-open expires the
 * admin's browser is long gone, so the reset has to ride on whoever asks next.
 * Route handlers only: it writes to the database and calls `revalidateTag`.
 */
export async function readStoreStatusFresh(): Promise<{
  settings: Settings | null;
  status: StoreStatusResult;
}> {
  const admin = createAdminClient();
  const { data } = await admin.from("settings").select("*").eq("id", 1).maybeSingle();
  let settings = (data as Settings | null) ?? null;
  let status = getStoreOpenStatus(settings);

  if (status.forceOpenLapsed && settings) {
    // Retire the flag. Note this happens whether or not the shop ends up
    // closed: inside opening hours the schedule keeps it open and the flag is
    // simply no longer needed.
    const reset = {
      open_mode: "auto" as const,
      force_open_until: null,
      is_active: true,
      updated_at: new Date().toISOString(),
    };
    const { error } = await admin.from("settings").update(reset).eq("id", 1);

    if (error) {
      // Most likely the migration adding open_mode has not been run yet. The
      // computed status is still correct, so serve it rather than failing.
      console.warn("Could not retire the lapsed force-open:", error.message);
    } else {
      settings = { ...settings, ...reset };
      status = getStoreOpenStatus(settings);
      revalidateSettings();
    }
  }

  return { settings, status };
}
