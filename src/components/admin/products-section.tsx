"use client";

/**
 * Products — what is on the menu and what it actually earns.
 *
 * Availability can be toggled straight from the table because "we're out of
 * chicken" is a thirty-second problem, and making someone switch to Price
 * Manager for it is the difference between the toggle being used and not. Price
 * edits stay in Price Manager: they deserve the wider layout and a confirm step.
 */

import { useMemo, useState } from "react";
import type { AdminStats, ProductStat } from "@/lib/admin-stats";
import { formatInt, formatRs } from "@/lib/admin-stats";
import { BarList, ChartCard, EmptyViz } from "./charts";
import { StatRow, StatTile } from "./stat-tile";
import { toast } from "sonner";

type SortKey = "revenue" | "units" | "name" | "price";

export function ProductsSection({
  stats,
  loadingStats,
  onRefreshStats,
  onOpenPrices,
}: {
  stats: AdminStats | null;
  loadingStats: boolean;
  onRefreshStats: () => void;
  onOpenPrices: () => void;
}) {
  const [sort, setSort] = useState<SortKey>("revenue");
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  /** Optimistic availability, keyed by item id, until the stats refetch lands. */
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const list = useMemo<ProductStat[]>(() => {
    const rows = (stats?.products.list ?? []).map((p) =>
      p.id && p.id in overrides ? { ...p, is_available: overrides[p.id] } : p
    );
    const q = query.trim().toLowerCase();
    const filtered = rows.filter(
      (p) =>
        (category === "all" || p.category === category) &&
        (!q || p.name.toLowerCase().includes(q))
    );
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sort) {
        case "units":
          return b.units - a.units || b.revenue - a.revenue;
        case "name":
          return a.name.localeCompare(b.name);
        case "price":
          return (b.price ?? 0) - (a.price ?? 0);
        default:
          return b.revenue - a.revenue || b.units - a.units;
      }
    });
    return sorted;
  }, [stats, overrides, query, category, sort]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of stats?.products.list ?? []) if (p.category) set.add(p.category);
    return [...set].sort();
  }, [stats]);

  const byCategory = useMemo(() => {
    const map = new Map<string, { revenue: number; units: number }>();
    for (const p of stats?.products.list ?? []) {
      const key = p.category || "Uncategorised";
      const e = map.get(key) ?? { revenue: 0, units: 0 };
      e.revenue += p.revenue;
      e.units += p.units;
      map.set(key, e);
    }
    return [...map.entries()]
      .map(([name, v]) => ({
        key: name,
        label: name,
        value: v.revenue,
        hint: `${formatInt(v.units)} sold`,
      }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [stats]);

  const neverSold = useMemo(
    () => (stats?.products.list ?? []).filter((p) => p.units === 0 && p.id).length,
    [stats]
  );

  async function toggleAvailability(p: ProductStat) {
    if (!p.id || saving) return;
    const next = !(p.is_available !== false);
    setSaving(p.id);
    setOverrides((o) => ({ ...o, [p.id!]: next }));
    try {
      const res = await fetch("/api/admin/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, is_available: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || data.error || "Failed to update availability");
      }
      toast.success(`${p.name} is now ${next ? "available" : "out of stock"}`);
      onRefreshStats();
    } catch (err: unknown) {
      // Roll the optimistic flip back — the menu now disagrees with the shop.
      setOverrides((o) => {
        const copy = { ...o };
        delete copy[p.id!];
        return copy;
      });
      toast.error(err instanceof Error ? err.message : "Failed to update availability");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-4">
      <StatRow>
        <StatTile
          label="Menu items"
          value={stats ? formatInt(stats.products.total) : loadingStats ? "…" : "0"}
          icon="restaurant_menu"
          hint={stats ? `${formatInt(stats.products.categories)} categories` : undefined}
        />
        <StatTile
          label="Available"
          value={stats ? formatInt(stats.products.available) : loadingStats ? "…" : "0"}
          icon="check_circle"
        />
        <StatTile
          label="Out of stock"
          value={stats ? formatInt(stats.products.unavailable) : loadingStats ? "…" : "0"}
          icon="remove_shopping_cart"
          hint="Hidden from the menu"
        />
        <StatTile
          label="Never sold"
          value={stats ? formatInt(neverSold) : loadingStats ? "…" : "0"}
          icon="production_quantity_limits"
          hint="No units in any order"
        />
        <StatTile
          label="Edit prices"
          value="Price Manager"
          icon="sell"
          hint="Open the editor"
          onClick={onOpenPrices}
        />
      </StatRow>

      <ChartCard title="Revenue by category" subtitle="All time">
        <BarList
          rows={byCategory}
          formatValue={formatRs}
          valueName="Revenue"
          emptyLabel={loadingStats ? "Loading…" : "No sales recorded yet"}
        />
      </ChartCard>

      <section className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] overflow-hidden">
        <header className="px-4 py-3 border-b border-[var(--color-outline-variant)] space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-[var(--color-on-surface)]">
                Every product
              </h3>
              <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                Lifetime units and revenue · toggle availability inline
              </p>
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort products"
              className="shrink-0 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-2.5 py-2 text-xs font-bold text-[var(--color-on-surface)] cursor-pointer"
            >
              <option value="revenue">Top revenue</option>
              <option value="units">Most sold</option>
              <option value="price">Highest price</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products"
              aria-label="Search products"
              className="flex-1 min-w-0 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 py-2 text-sm font-medium text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:outline-none focus:border-[var(--color-primary)]"
            />
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {["all", ...categories].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={`px-2.5 py-2 rounded-xl border text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    category === c
                      ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white"
                      : "bg-[var(--color-surface-container-lowest)] border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]"
                  }`}
                >
                  {c === "all" ? "All" : c}
                </button>
              ))}
            </div>
          </div>
        </header>

        {list.length === 0 ? (
          <EmptyViz label={loadingStats ? "Loading products…" : "No products match"} />
        ) : (
          <div className="overflow-x-auto slim-scrollbar">
            <table className="w-full text-xs min-w-[540px]">
              <thead className="bg-[var(--color-surface-container-low)]">
                <tr className="text-[10px] uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  <th scope="col" className="text-left font-extrabold px-4 py-2">
                    Product
                  </th>
                  <th scope="col" className="text-right font-extrabold px-3 py-2">
                    Price
                  </th>
                  <th scope="col" className="text-right font-extrabold px-3 py-2">
                    Units
                  </th>
                  <th scope="col" className="text-right font-extrabold px-3 py-2">
                    Revenue
                  </th>
                  <th scope="col" className="text-right font-extrabold px-4 py-2">
                    Availability
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const available = p.is_available !== false;
                  return (
                    <tr
                      key={p.id ?? `off-menu-${p.name}`}
                      className="border-t border-[var(--color-outline-variant)]"
                    >
                      <td className="px-4 py-2.5">
                        <div className="font-bold text-[var(--color-on-surface)]">{p.name}</div>
                        <div className="text-[10px] text-[var(--color-on-surface-variant)] mt-0.5">
                          {p.id ? p.category || "Uncategorised" : "No longer on the menu"}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[var(--color-on-surface)]">
                        {p.price !== null ? `Rs. ${p.price}` : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-bold text-[var(--color-on-surface)]">
                        {formatInt(p.units)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-extrabold text-[var(--color-on-surface)]">
                        {formatRs(p.revenue)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {p.id ? (
                          <button
                            type="button"
                            onClick={() => void toggleAvailability(p)}
                            disabled={saving === p.id}
                            aria-pressed={available}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                              available
                                ? "bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]"
                                : "bg-[#fdeceb] border-[#f2b8b5] text-[#8f1d1d] hover:bg-[#fbdedc]"
                            }`}
                          >
                            <span
                              className="material-symbols-outlined text-[13px]"
                              aria-hidden="true"
                            >
                              {available ? "check_circle" : "remove_shopping_cart"}
                            </span>
                            {available ? "Available" : "Out of stock"}
                          </button>
                        ) : (
                          <span className="text-[var(--color-on-surface-variant)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
