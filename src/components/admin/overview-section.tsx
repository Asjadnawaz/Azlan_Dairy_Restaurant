"use client";

/**
 * Overview — the "what is happening right now" screen.
 *
 * Today's numbers first, then the 14-day shape, then the live pipeline, then the
 * active orders themselves. Every KPI tile that maps onto an order filter is a
 * button that jumps to the Orders section pre-filtered, so the tile is a way in
 * rather than a dead end.
 */

import { useMemo, useState } from "react";
import type { AdminStats } from "@/lib/admin-stats";
import {
  formatInt,
  formatRs,
  formatRsCompact,
  pctChange,
  shortDayLabel,
} from "@/lib/admin-stats";
import type { Order, OrderItem, Rider } from "@/lib/supabase/database.types";
import { isActiveOrder } from "@/lib/orders";
import { ChartCard, ColumnChart, EmptyViz, StageBars } from "./charts";
import { StatRow, StatTile } from "./stat-tile";
import { OrderRow, OrderRowHeader } from "./order-row";
import type { OrderFilter } from "./orders-section";

export function OverviewSection({
  stats,
  loadingStats,
  orders,
  itemsByOrder,
  riders,
  onPrint,
  onJumpToOrders,
}: {
  stats: AdminStats | null;
  loadingStats: boolean;
  orders: Order[];
  itemsByOrder: Map<string, OrderItem[]>;
  riders: Rider[];
  onPrint: (order: Order, items: OrderItem[], width?: "80mm" | "58mm") => void;
  onJumpToOrders: (filter: OrderFilter) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const active = useMemo(() => orders.filter(isActiveOrder), [orders]);

  const columns = useMemo(
    () =>
      (stats?.daily ?? []).map((d) => ({
        key: d.date,
        label: shortDayLabel(d.date),
        value: d.revenue,
        hint: `${d.orders} order${d.orders === 1 ? "" : "s"}`,
      })),
    [stats]
  );

  const trend = useMemo(() => (stats?.daily ?? []).map((d) => d.revenue), [stats]);
  const orderTrend = useMemo(() => (stats?.daily ?? []).map((d) => d.orders), [stats]);

  const pendingCount = stats?.pipeline.find((p) => p.status === "pending")?.count ?? 0;

  return (
    <div className="space-y-4">
      <StatRow>
        <StatTile
          hero
          label="Revenue today"
          value={stats ? formatRs(stats.today.revenue) : loadingStats ? "…" : "Rs. 0"}
          icon="payments"
          trend={trend}
          delta={
            stats
              ? { pct: pctChange(stats.today.revenue, stats.yesterday.revenue), vs: "vs yesterday" }
              : undefined
          }
          hint={stats ? `${formatRs(stats.yesterday.revenue)} yesterday` : undefined}
        />
        <StatTile
          label="Orders today"
          value={stats ? formatInt(stats.today.orders) : loadingStats ? "…" : "0"}
          icon="receipt_long"
          trend={orderTrend}
          delta={
            stats
              ? { pct: pctChange(stats.today.orders, stats.yesterday.orders), vs: "vs yesterday" }
              : undefined
          }
        />
        <StatTile
          label="Avg order value"
          value={stats ? formatRs(stats.today.aov) : loadingStats ? "…" : "Rs. 0"}
          icon="local_atm"
          hint={stats ? `${formatRs(stats.last7.aov)} over 7 days` : undefined}
        />
        <StatTile
          label="Needs action"
          value={formatInt(pendingCount)}
          icon="hourglass_top"
          hint="Pending orders — tap to open"
          onClick={() => onJumpToOrders("pending")}
        />
        <StatTile
          label="Customers"
          value={stats ? formatInt(stats.customers.total) : loadingStats ? "…" : "0"}
          icon="groups"
          hint={stats ? `${formatInt(stats.customers.new_today)} new today` : undefined}
        />
      </StatRow>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <ChartCard
          title="Revenue, last 14 days"
          subtitle={
            stats
              ? `${formatRs(stats.last7.revenue)} in the last 7 days · ${formatRs(
                  stats.last30.revenue
                )} in 30`
              : "Loading…"
          }
        >
          {columns.length > 0 ? (
            <ColumnChart
              data={columns}
              formatValue={formatRs}
              formatTick={formatRsCompact}
              valueName="Revenue"
            />
          ) : (
            <EmptyViz label={loadingStats ? "Loading revenue…" : "No revenue recorded yet"} />
          )}
        </ChartCard>

        <ChartCard
          title="Order pipeline"
          subtitle="Where every order sits right now"
          action={
            <button
              type="button"
              onClick={() => onJumpToOrders("all")}
              className="text-[11px] font-bold text-[var(--color-primary)] hover:underline cursor-pointer shrink-0"
            >
              View all
            </button>
          }
        >
          {stats ? (
            <StageBars stages={stats.pipeline.map((p) => ({ label: p.label, count: p.count }))} />
          ) : (
            <EmptyViz label="Loading pipeline…" />
          )}
        </ChartCard>
      </div>

      <section className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--color-outline-variant)]">
          <div>
            <h3 className="text-sm font-extrabold text-[var(--color-on-surface)]">Live orders</h3>
            <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
              {active.length} order{active.length === 1 ? "" : "s"} still in progress
            </p>
          </div>
          <button
            type="button"
            onClick={() => onJumpToOrders("all")}
            className="text-[11px] font-bold text-[var(--color-primary)] hover:underline cursor-pointer shrink-0"
          >
            All orders
          </button>
        </header>

        <OrderRowHeader />

        {active.length === 0 ? (
          <div className="py-12 text-center">
            <span
              className="material-symbols-outlined text-[36px] text-[var(--color-on-surface-variant)]"
              aria-hidden="true"
            >
              inbox
            </span>
            <p className="mt-1 text-sm font-extrabold text-[var(--color-on-surface)]">
              Nothing in progress
            </p>
            <p className="text-xs text-[var(--color-on-surface-variant)]">
              All caught up — new orders land here instantly.
            </p>
          </div>
        ) : (
          active.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              items={itemsByOrder.get(order.id) ?? []}
              riders={riders}
              expanded={expandedId === order.id}
              onToggle={(id) => setExpandedId((cur) => (cur === id ? null : id))}
              onPrint={onPrint}
            />
          ))
        )}
      </section>
    </div>
  );
}
