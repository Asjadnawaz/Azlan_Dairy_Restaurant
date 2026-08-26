import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildAdminStats,
  isAdminStats,
  type AdminStats,
  type StatsItemRow,
  type StatsMenuRow,
  type StatsOrderRow,
} from "@/lib/admin-stats";

/**
 * The dashboard aggregate, fetched with the service-role key.
 *
 * Lives here — not in `admin-stats.ts` — so the `createAdminClient` import never
 * reaches the browser bundle. Both `GET /api/admin/stats` (the realtime refresh)
 * and the admin server page (the initial seed) call this, so the fast-path RPC,
 * the query fallback and the truncation ceilings are defined exactly once.
 */

/**
 * Hard ceilings so a runaway order table can never blow up the response. The
 * shop does tens of orders a day, so these are years of headroom — but if they
 * are ever hit the aggregates would quietly go stale, which is why `truncated`
 * comes back and the dashboard says so out loud.
 */
const ORDER_LIMIT = 5000;
const ITEM_LIMIT = 30000;

export type AdminStatsResult = {
  stats: AdminStats;
  source: "rpc" | "query";
  truncated: boolean;
};

export async function fetchAdminStats(): Promise<AdminStatsResult> {
  const admin = createAdminClient();

  // Fast path: one round-trip, if admin_dashboard_stats() has been created.
  // Missing function → PostgREST 404/PGRST202, which is not an error worth
  // surfacing; the query path below produces the identical shape. The shape is
  // checked rather than trusted — the function is pasted in by hand, so a stale
  // or partial version has to fall through instead of blanking the dashboard.
  const rpc = await admin.rpc("admin_dashboard_stats");
  if (!rpc.error && isAdminStats(rpc.data)) {
    return { stats: rpc.data, source: "rpc", truncated: false };
  }
  if (!rpc.error && rpc.data) {
    console.warn(
      "admin_dashboard_stats() returned an unexpected shape — falling back to queries."
    );
  }

  const [ordersRes, itemsRes, menuRes, profilesRes] = await Promise.all([
    admin
      .from("orders")
      .select(
        "id,total,status,placed_at,customer_name,customer_phone,customer_note,customer_address,user_id"
      )
      .order("placed_at", { ascending: false })
      .limit(ORDER_LIMIT),
    admin
      .from("order_items")
      .select("order_id,name_snapshot,quantity,line_total")
      .limit(ITEM_LIMIT),
    admin.from("items").select("id,name,category,price,is_available"),
    admin.from("profiles").select("phone"),
  ]);

  if (ordersRes.error) {
    throw new Error(ordersRes.error.message);
  }

  const orders = (ordersRes.data ?? []) as StatsOrderRow[];
  const items = (itemsRes.data ?? []) as StatsItemRow[];
  const menu = (menuRes.data ?? []) as StatsMenuRow[];
  const registeredPhones = new Set(
    ((profilesRes.data ?? []) as { phone: string | null }[])
      .map((p) => p.phone?.trim())
      .filter((p): p is string => Boolean(p))
  );

  const stats = buildAdminStats(orders, items, menu, registeredPhones);

  return {
    stats,
    source: "query",
    truncated: orders.length >= ORDER_LIMIT || items.length >= ITEM_LIMIT,
  };
}
