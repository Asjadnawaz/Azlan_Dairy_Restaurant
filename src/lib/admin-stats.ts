/**
 * Admin dashboard aggregates.
 *
 * The whole dashboard reads one `AdminStats` object, built either by the
 * `admin_dashboard_stats()` Postgres function (fast path, opt-in — see the SQL
 * handed over with this change) or by `buildAdminStats()` below over raw rows
 * (default path, no schema changes needed). Both produce the same shape, so the
 * UI never branches on which one ran.
 *
 * Day bucketing is done at a fixed +05:00 (Pakistan Standard Time, no DST)
 * rather than in the server's local zone. "Today" has to mean today in Malir —
 * on a Vercel box running UTC, a local-time bucket would roll the day over at
 * 5am Karachi time and cut the previous night's dinner rush in half.
 */

import { parseOrderNote } from "@/lib/orders";
import type { OrderStatus } from "@/lib/supabase/database.types";

/* -------------------------------------------------------------------------- */
/* Shapes                                                                     */
/* -------------------------------------------------------------------------- */

/** Revenue / order-count pair for one time window. */
export type StatsWindow = {
  revenue: number;
  orders: number;
  /** Average order value; 0 when there are no orders. */
  aov: number;
};

export type DailyPoint = {
  /** YYYY-MM-DD in PKT. */
  date: string;
  revenue: number;
  orders: number;
};

export type ProductStat = {
  id: string | null;
  name: string;
  category: string | null;
  price: number | null;
  is_available: boolean | null;
  units: number;
  revenue: number;
};

export type CustomerStat = {
  name: string;
  phone: string;
  orders: number;
  spent: number;
  /** ISO timestamp of the most recent order. */
  last_order: string;
  first_order: string;
  is_registered: boolean;
};

export type AdminStats = {
  generated_at: string;
  today: StatsWindow;
  yesterday: StatsWindow;
  last7: StatsWindow;
  prev7: StatsWindow;
  last30: StatsWindow;
  all: StatsWindow;
  /** Cancelled orders across all time — excluded from every revenue figure. */
  cancelled: number;
  /** Exactly 14 points, oldest first, zero-filled for days with no orders. */
  daily: DailyPoint[];
  /** Orders per hour of the PKT day, 24 points, index === hour. */
  hourly: number[];
  pipeline: { status: OrderStatus | "with_rider"; label: string; count: number }[];
  fulfilment: { delivery: number; pickup: number };
  payment: { cod: number; bank: number };
  products: {
    total: number;
    available: number;
    unavailable: number;
    categories: number;
    /** Every menu item, joined to its lifetime sales, revenue-sorted. */
    list: ProductStat[];
  };
  customers: {
    total: number;
    /** Customers with more than one order. */
    repeat: number;
    registered: number;
    /** Phone numbers whose first-ever order landed today. */
    new_today: number;
    list: CustomerStat[];
  };
};

/** The order columns the aggregation needs — deliberately narrow. */
export type StatsOrderRow = {
  id: string;
  total: number | null;
  status: OrderStatus;
  placed_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_note: string | null;
  customer_address: string | null;
  user_id: string | null;
};

export type StatsItemRow = {
  order_id: string;
  name_snapshot: string;
  quantity: number | null;
  line_total: number | null;
};

export type StatsMenuRow = {
  id: string;
  name: string;
  category: string | null;
  price: number | null;
  is_available: boolean | null;
};

/* -------------------------------------------------------------------------- */
/* PKT day/hour keys                                                          */
/* -------------------------------------------------------------------------- */

const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

/** YYYY-MM-DD for a timestamp, as seen in Karachi. */
export function pktDateKey(iso: string | number | Date): string {
  const ms = iso instanceof Date ? iso.getTime() : new Date(iso).getTime();
  return new Date(ms + PKT_OFFSET_MS).toISOString().slice(0, 10);
}

/** 0–23 hour for a timestamp, as seen in Karachi. */
function pktHour(iso: string): number {
  return new Date(new Date(iso).getTime() + PKT_OFFSET_MS).getUTCHours();
}

/** The n most recent PKT day keys, oldest first. */
function recentDayKeys(now: number, days: number): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    keys.push(pktDateKey(now - i * 86_400_000));
  }
  return keys;
}

/* -------------------------------------------------------------------------- */
/* Aggregation                                                                */
/* -------------------------------------------------------------------------- */

function windowOf(revenue: number, orders: number): StatsWindow {
  return { revenue, orders, aov: orders > 0 ? Math.round(revenue / orders) : 0 };
}

const PIPELINE_LABELS: { status: OrderStatus | "with_rider"; label: string }[] = [
  { status: "pending", label: "Pending" },
  { status: "preparing", label: "Preparing" },
  { status: "ready", label: "Ready" },
  { status: "with_rider", label: "With rider" },
  { status: "completed", label: "Delivered" },
];

/**
 * Builds the dashboard aggregates from raw rows.
 *
 * `registeredPhones` is the set of phone numbers that have a profile row;
 * combined with `orders.user_id` it separates account holders from guests, which
 * is the only signal available — there is no customers table.
 */
export function buildAdminStats(
  orders: StatsOrderRow[],
  items: StatsItemRow[],
  menu: StatsMenuRow[],
  registeredPhones: Set<string> = new Set(),
  nowMs: number = Date.now()
): AdminStats {
  const todayKey = pktDateKey(nowMs);
  const yesterdayKey = pktDateKey(nowMs - 86_400_000);
  const dayKeys = recentDayKeys(nowMs, 14);
  const day7Cutoff = pktDateKey(nowMs - 6 * 86_400_000);
  const prev7Start = pktDateKey(nowMs - 13 * 86_400_000);
  const day30Cutoff = pktDateKey(nowMs - 29 * 86_400_000);

  const daily = new Map<string, DailyPoint>(
    dayKeys.map((date) => [date, { date, revenue: 0, orders: 0 }])
  );
  const hourly = new Array<number>(24).fill(0);

  let todayRevenue = 0;
  let todayOrders = 0;
  let yRevenue = 0;
  let yOrders = 0;
  let r7 = 0;
  let o7 = 0;
  let rPrev7 = 0;
  let oPrev7 = 0;
  let r30 = 0;
  let o30 = 0;
  let rAll = 0;
  let oAll = 0;
  let cancelled = 0;

  const pipeline = new Map<OrderStatus | "with_rider", number>();
  let delivery = 0;
  let pickup = 0;
  let cod = 0;
  let bank = 0;

  // Cancelled orders keep their pipeline slot but are excluded from revenue and
  // from the fulfilment / payment splits — an order that never went out tells you
  // nothing about how the shop delivers or gets paid.
  const revenueOrderIds = new Set<string>();
  const customers = new Map<string, CustomerStat>();

  for (const o of orders) {
    const key = pktDateKey(o.placed_at);
    const total = Number(o.total ?? 0);

    if (o.status === "cancelled") {
      cancelled++;
      pipeline.set("cancelled", (pipeline.get("cancelled") ?? 0) + 1);
      continue;
    }

    revenueOrderIds.add(o.id);

    const bucket: OrderStatus | "with_rider" =
      o.status === "picked_up" || o.status === "delivering" || o.status === "out_for_delivery"
        ? "with_rider"
        : o.status === "delivered"
        ? "completed"
        : o.status;
    pipeline.set(bucket, (pipeline.get(bucket) ?? 0) + 1);

    rAll += total;
    oAll++;

    const point = daily.get(key);
    if (point) {
      point.revenue += total;
      point.orders++;
    }
    hourly[pktHour(o.placed_at)]++;

    if (key === todayKey) {
      todayRevenue += total;
      todayOrders++;
    }
    if (key === yesterdayKey) {
      yRevenue += total;
      yOrders++;
    }
    if (key >= day7Cutoff) {
      r7 += total;
      o7++;
    } else if (key >= prev7Start) {
      rPrev7 += total;
      oPrev7++;
    }
    if (key >= day30Cutoff) {
      r30 += total;
      o30++;
    }

    const parsed = parseOrderNote(o.customer_note);
    const isPickup =
      parsed.orderTypeTag === "PICKUP" ||
      (o.customer_address?.toLowerCase().includes("store pickup") ?? false);
    if (isPickup) pickup++;
    else delivery++;
    if (parsed.isCod) cod++;
    else bank++;

    // Phone is the customer identity: guests never get a user_id, and the same
    // person often orders both signed in and as a guest.
    const phone = (o.customer_phone ?? "").trim();
    if (phone) {
      const existing = customers.get(phone);
      if (existing) {
        existing.orders++;
        existing.spent += total;
        if (o.placed_at > existing.last_order) {
          existing.last_order = o.placed_at;
          // Freshest name wins — people fix their own spelling over time.
          existing.name = o.customer_name?.trim() || existing.name;
        }
        if (o.placed_at < existing.first_order) existing.first_order = o.placed_at;
        existing.is_registered = existing.is_registered || Boolean(o.user_id);
      } else {
        customers.set(phone, {
          name: o.customer_name?.trim() || "Guest",
          phone,
          orders: 1,
          spent: total,
          last_order: o.placed_at,
          first_order: o.placed_at,
          is_registered: Boolean(o.user_id) || registeredPhones.has(phone),
        });
      }
    }
  }

  /* Products -------------------------------------------------------------- */

  const sold = new Map<string, { units: number; revenue: number }>();
  for (const it of items) {
    if (!revenueOrderIds.has(it.order_id)) continue;
    const name = it.name_snapshot;
    const entry = sold.get(name) ?? { units: 0, revenue: 0 };
    entry.units += Number(it.quantity ?? 0);
    entry.revenue += Number(it.line_total ?? 0);
    sold.set(name, entry);
  }

  const productList: ProductStat[] = menu.map((m) => {
    const s = sold.get(m.name);
    return {
      id: m.id,
      name: m.name,
      category: m.category,
      price: m.price,
      is_available: m.is_available,
      units: s?.units ?? 0,
      revenue: s?.revenue ?? 0,
    };
  });

  // Items sold under a name that is no longer on the menu still earned money, so
  // they stay in the list rather than silently vanishing from the revenue total.
  const menuNames = new Set(menu.map((m) => m.name));
  for (const [name, s] of sold) {
    if (menuNames.has(name)) continue;
    productList.push({
      id: null,
      name,
      category: null,
      price: null,
      is_available: null,
      units: s.units,
      revenue: s.revenue,
    });
  }

  productList.sort((a, b) => b.revenue - a.revenue || b.units - a.units);

  const customerList = [...customers.values()].sort((a, b) => b.spent - a.spent);

  return {
    generated_at: new Date(nowMs).toISOString(),
    today: windowOf(todayRevenue, todayOrders),
    yesterday: windowOf(yRevenue, yOrders),
    last7: windowOf(r7, o7),
    prev7: windowOf(rPrev7, oPrev7),
    last30: windowOf(r30, o30),
    all: windowOf(rAll, oAll),
    cancelled,
    daily: dayKeys.map((d) => daily.get(d)!),
    hourly,
    pipeline: PIPELINE_LABELS.map(({ status, label }) => ({
      status,
      label,
      count: pipeline.get(status) ?? 0,
    })),
    fulfilment: { delivery, pickup },
    payment: { cod, bank },
    products: {
      total: menu.length,
      available: menu.filter((m) => m.is_available !== false).length,
      unavailable: menu.filter((m) => m.is_available === false).length,
      categories: new Set(menu.map((m) => m.category).filter(Boolean)).size,
      list: productList,
    },
    customers: {
      total: customerList.length,
      repeat: customerList.filter((c) => c.orders > 1).length,
      registered: customerList.filter((c) => c.is_registered).length,
      new_today: customerList.filter((c) => pktDateKey(c.first_order) === todayKey).length,
      list: customerList,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* RPC validation                                                             */
/* -------------------------------------------------------------------------- */

function isWindow(v: unknown): boolean {
  const w = v as StatsWindow | undefined;
  return (
    typeof w === "object" &&
    w !== null &&
    typeof w.revenue === "number" &&
    typeof w.orders === "number" &&
    typeof w.aov === "number"
  );
}

/**
 * Guards the `admin_dashboard_stats()` fast path.
 *
 * That function is created by hand in the SQL editor, so a half-pasted or
 * out-of-date version is a real possibility — and without this check a JSONB
 * result missing `daily` or `customers` would sail through `as AdminStats` and
 * render an empty dashboard with no error anywhere. Failing the check here sends
 * the request down the query path instead, which is always correct.
 */
export function isAdminStats(value: unknown): value is AdminStats {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Partial<AdminStats>;

  if (typeof s.generated_at !== "string") return false;
  if (
    !isWindow(s.today) ||
    !isWindow(s.yesterday) ||
    !isWindow(s.last7) ||
    !isWindow(s.prev7) ||
    !isWindow(s.last30) ||
    !isWindow(s.all)
  ) {
    return false;
  }
  if (typeof s.cancelled !== "number") return false;
  if (!Array.isArray(s.daily) || s.daily.length !== 14) return false;
  if (!Array.isArray(s.hourly) || s.hourly.length !== 24) return false;
  if (!Array.isArray(s.pipeline)) return false;
  if (typeof s.fulfilment?.delivery !== "number") return false;
  if (typeof s.payment?.cod !== "number") return false;
  if (typeof s.products?.total !== "number" || !Array.isArray(s.products.list)) return false;
  if (typeof s.customers?.total !== "number" || !Array.isArray(s.customers.list)) return false;

  return true;
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

/** "Rs. 12,480". Rupees are never shown with paisa in this shop. */
export function formatRs(n: number): string {
  return `Rs. ${Math.round(n).toLocaleString("en-PK")}`;
}

/** Compacts a rupee figure for stat tiles: 940 · 12.5K · 1.4M. */
export function formatRsCompact(n: number): string {
  const v = Math.round(n);
  if (Math.abs(v) >= 1_000_000) return `Rs. ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 10_000) return `Rs. ${(v / 1000).toFixed(1)}K`;
  return `Rs. ${v.toLocaleString("en-PK")}`;
}

export function formatInt(n: number): string {
  return Math.round(n).toLocaleString("en-PK");
}

/**
 * Percentage change, or null when the baseline is zero — "+∞%" against a day
 * with no orders is noise, not information.
 */
export function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** "24 Aug" — short day label for the 14-day axis. */
export function shortDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
