"use client";

/**
 * Sales — money over time, and where it comes from.
 *
 * Revenue and order count are two different scales, so they get two charts
 * rather than one chart with two y-axes. Busiest hours is a column chart of
 * counts, not a heatmap: 24 numbers read fine as bars and a heatmap would need a
 * sequential ramp to say something bars already say.
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
import { ChartCard, ColumnChart, EmptyViz, SplitBar, BarList } from "./charts";
import { StatRow, StatTile } from "./stat-tile";

type Metric = "revenue" | "orders";

/** 12h clock label for the hour axis — "9a", "12p", "11p". */
function hourLabel(h: number): string {
  const suffix = h < 12 ? "a" : "p";
  const base = h % 12 === 0 ? 12 : h % 12;
  return `${base}${suffix}`;
}

export function SalesSection({
  stats,
  loadingStats,
}: {
  stats: AdminStats | null;
  loadingStats: boolean;
}) {
  const [metric, setMetric] = useState<Metric>("revenue");

  const columns = useMemo(
    () =>
      (stats?.daily ?? []).map((d) => ({
        key: d.date,
        label: shortDayLabel(d.date),
        value: metric === "revenue" ? d.revenue : d.orders,
        hint:
          metric === "revenue"
            ? `${d.orders} order${d.orders === 1 ? "" : "s"}`
            : formatRs(d.revenue),
      })),
    [stats, metric]
  );

  // Trading hours only. Plotting 3am–8am as empty bars just to be complete
  // squeezes the hours that matter into a third of the width.
  const hourColumns = useMemo(() => {
    const hourly = stats?.hourly ?? [];
    if (hourly.length !== 24) return [];
    const busy = hourly.map((v, h) => ({ v, h })).filter((x) => x.v > 0);
    if (busy.length === 0) return [];
    const from = Math.max(0, Math.min(...busy.map((x) => x.h)) - 1);
    const to = Math.min(23, Math.max(...busy.map((x) => x.h)) + 1);
    return hourly.slice(from, to + 1).map((v, i) => ({
      key: `h${from + i}`,
      label: hourLabel(from + i),
      value: v,
    }));
  }, [stats]);

  const topByRevenue = useMemo(
    () =>
      (stats?.products.list ?? [])
        .filter((p) => p.revenue > 0)
        .slice(0, 8)
        .map((p) => ({
          key: p.name,
          label: p.name,
          value: p.revenue,
          hint: `${formatInt(p.units)} sold`,
        })),
    [stats]
  );

  const topByUnits = useMemo(
    () =>
      [...(stats?.products.list ?? [])]
        .filter((p) => p.units > 0)
        .sort((a, b) => b.units - a.units)
        .slice(0, 8)
        .map((p) => ({
          key: p.name,
          label: p.name,
          value: p.units,
          hint: formatRs(p.revenue),
        })),
    [stats]
  );

  const peakHour = useMemo(() => {
    const hourly = stats?.hourly ?? [];
    if (hourly.length !== 24) return null;
    let best = 0;
    for (let h = 1; h < 24; h++) if (hourly[h] > hourly[best]) best = h;
    return hourly[best] > 0 ? { hour: best, count: hourly[best] } : null;
  }, [stats]);

  return (
    <div className="space-y-4">
      <StatRow>
        <StatTile
          hero
          label="Revenue, last 7 days"
          value={stats ? formatRs(stats.last7.revenue) : loadingStats ? "…" : "Rs. 0"}
          icon="trending_up"
          delta={
            stats
              ? {
                  pct: pctChange(stats.last7.revenue, stats.prev7.revenue),
                  vs: "vs previous 7",
                }
              : undefined
          }
        />
        <StatTile
          label="Revenue, last 30 days"
          value={stats ? formatRs(stats.last30.revenue) : loadingStats ? "…" : "Rs. 0"}
          icon="calendar_month"
          hint={stats ? `${formatInt(stats.last30.orders)} orders` : undefined}
        />
        <StatTile
          label="Lifetime revenue"
          value={stats ? formatRs(stats.all.revenue) : loadingStats ? "…" : "Rs. 0"}
          icon="savings"
          hint={stats ? `${formatInt(stats.all.orders)} orders all time` : undefined}
        />
        <StatTile
          label="Avg order value"
          value={stats ? formatRs(stats.all.aov) : loadingStats ? "…" : "Rs. 0"}
          icon="local_atm"
          hint={stats ? `${formatRs(stats.last7.aov)} over 7 days` : undefined}
        />
        <StatTile
          label="Cancelled"
          value={stats ? formatInt(stats.cancelled) : loadingStats ? "…" : "0"}
          icon="cancel"
          hint="Excluded from revenue"
        />
      </StatRow>

      <ChartCard
        title={metric === "revenue" ? "Revenue, last 14 days" : "Orders, last 14 days"}
        subtitle={
          peakHour
            ? `Busiest hour is ${hourLabel(peakHour.hour)} with ${formatInt(
                peakHour.count
              )} orders all time`
            : "Daily totals in Pakistan time"
        }
        action={
          <div
            className="flex rounded-xl border border-[var(--color-outline-variant)] overflow-hidden shrink-0"
            role="group"
            aria-label="Choose metric"
          >
            {(["revenue", "orders"] as Metric[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                aria-pressed={metric === m}
                className={`px-2.5 py-1.5 text-[11px] font-bold capitalize transition-colors cursor-pointer ${
                  metric === m
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        }
      >
        {columns.length > 0 ? (
          <ColumnChart
            data={columns}
            height={216}
            formatValue={metric === "revenue" ? formatRs : formatInt}
            formatTick={metric === "revenue" ? formatRsCompact : formatInt}
            valueName={metric === "revenue" ? "Revenue" : "Orders"}
          />
        ) : (
          <EmptyViz label={loadingStats ? "Loading…" : "No sales recorded yet"} />
        )}
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Top products by revenue" subtitle="All time">
          <BarList rows={topByRevenue} formatValue={formatRs} valueName="Revenue" />
        </ChartCard>

        <ChartCard title="Top products by units" subtitle="All time">
          <BarList rows={topByUnits} formatValue={formatInt} valueName="Units" />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Delivery vs pickup" subtitle="Share of completed orders">
          {stats ? (
            <SplitBar
              a={{ label: "Delivery", value: stats.fulfilment.delivery }}
              b={{ label: "Pickup", value: stats.fulfilment.pickup }}
            />
          ) : (
            <EmptyViz label="Loading…" />
          )}
        </ChartCard>

        <ChartCard title="How customers pay" subtitle="Share of completed orders">
          {stats ? (
            <SplitBar
              a={{ label: "Cash on delivery", value: stats.payment.cod }}
              b={{ label: "Bank transfer", value: stats.payment.bank }}
            />
          ) : (
            <EmptyViz label="Loading…" />
          )}
        </ChartCard>

        <ChartCard title="Busiest hours" subtitle="Orders by hour, all time (PKT)">
          {hourColumns.length > 0 ? (
            <ColumnChart
              data={hourColumns}
              height={148}
              formatValue={formatInt}
              valueName="Orders"
            />
          ) : (
            <EmptyViz label={loadingStats ? "Loading…" : "Not enough orders yet"} />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
