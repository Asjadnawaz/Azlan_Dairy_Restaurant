"use client";

/**
 * Customers — derived, not stored.
 *
 * There is no customers table: guests order with just a name and a phone, and
 * the same person often orders signed in one week and as a guest the next. Phone
 * number is therefore the identity, and the "Registered" badge means an account
 * exists for that number — not that the order came from one. Cancelled orders are
 * excluded upstream, so "spent" is money actually taken.
 */

import { useMemo, useState } from "react";
import type { AdminStats, CustomerStat } from "@/lib/admin-stats";
import { formatInt, formatRs } from "@/lib/admin-stats";
import { normalizePkPhone, timeAgo } from "@/lib/orders";
import { BarList, ChartCard, EmptyViz, SplitBar } from "./charts";
import { StatRow, StatTile } from "./stat-tile";

type SortKey = "spent" | "orders" | "recent" | "name";

const PAGE = 25;

export function CustomersSection({
  stats,
  loadingStats,
}: {
  stats: AdminStats | null;
  loadingStats: boolean;
}) {
  const [sort, setSort] = useState<SortKey>("spent");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const list = useMemo<CustomerStat[]>(() => {
    const q = query.trim().toLowerCase();
    const qPhone = q ? normalizePkPhone(q) : "";
    const rows = (stats?.customers.list ?? []).filter((c) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (qPhone.length > 3 && normalizePkPhone(c.phone).includes(qPhone))
      );
    });
    const sorted = [...rows];
    sorted.sort((a, b) => {
      switch (sort) {
        case "orders":
          return b.orders - a.orders || b.spent - a.spent;
        case "recent":
          return b.last_order.localeCompare(a.last_order);
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return b.spent - a.spent;
      }
    });
    return sorted;
  }, [stats, query, sort]);

  const topSpenders = useMemo(
    () =>
      (stats?.customers.list ?? [])
        .slice(0, 8)
        .filter((c) => c.spent > 0)
        .map((c) => ({
          key: c.phone,
          label: c.name,
          value: c.spent,
          hint: `${formatInt(c.orders)} order${c.orders === 1 ? "" : "s"}`,
        })),
    [stats]
  );

  const totals = stats?.customers;
  const oneTime = totals ? Math.max(0, totals.total - totals.repeat) : 0;
  const avgLifetime =
    totals && totals.total > 0 && stats ? Math.round(stats.all.revenue / totals.total) : 0;

  const visible = list.slice(0, limit);

  return (
    <div className="space-y-4">
      <StatRow>
        <StatTile
          hero
          label="Customers"
          value={totals ? formatInt(totals.total) : loadingStats ? "…" : "0"}
          icon="groups"
          hint="Unique phone numbers that ordered"
        />
        <StatTile
          label="Repeat customers"
          value={totals ? formatInt(totals.repeat) : loadingStats ? "…" : "0"}
          icon="repeat"
          hint={
            totals && totals.total > 0
              ? `${Math.round((totals.repeat / totals.total) * 100)}% ordered twice or more`
              : undefined
          }
        />
        <StatTile
          label="New today"
          value={totals ? formatInt(totals.new_today) : loadingStats ? "…" : "0"}
          icon="person_add"
          hint="First-ever order landed today"
        />
        <StatTile
          label="Registered accounts"
          value={totals ? formatInt(totals.registered) : loadingStats ? "…" : "0"}
          icon="verified_user"
          hint="The rest ordered as guests"
        />
        <StatTile
          label="Avg lifetime value"
          value={formatRs(avgLifetime)}
          icon="diamond"
          hint="Revenue ÷ customers"
        />
      </StatRow>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <ChartCard title="Top customers by spend" subtitle="All time">
          <BarList
            rows={topSpenders}
            formatValue={formatRs}
            valueName="Spent"
            emptyLabel={loadingStats ? "Loading…" : "No customers yet"}
          />
        </ChartCard>

        <ChartCard title="Loyalty" subtitle="Repeat vs one-time customers">
          {totals && totals.total > 0 ? (
            <SplitBar
              a={{ label: "Repeat", value: totals.repeat }}
              b={{ label: "One-time", value: oneTime }}
              unit="customers"
            />
          ) : (
            <EmptyViz label={loadingStats ? "Loading…" : "No customers yet"} />
          )}
        </ChartCard>
      </div>

      <section className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] overflow-hidden">
        <header className="px-4 py-3 border-b border-[var(--color-outline-variant)] flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-extrabold text-[var(--color-on-surface)]">
              Customer list
            </h3>
            <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
              Grouped by phone number across every order
            </p>
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
            placeholder="Search name or phone"
            aria-label="Search customers"
            className="sm:w-56 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-3 py-2 text-sm font-medium text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:outline-none focus:border-[var(--color-primary)]"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort customers"
            className="shrink-0 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] px-2.5 py-2 text-xs font-bold text-[var(--color-on-surface)] cursor-pointer"
          >
            <option value="spent">Top spenders</option>
            <option value="orders">Most orders</option>
            <option value="recent">Most recent</option>
            <option value="name">Name A–Z</option>
          </select>
        </header>

        {visible.length === 0 ? (
          <EmptyViz label={loadingStats ? "Loading customers…" : "No customers match"} />
        ) : (
          <div className="overflow-x-auto slim-scrollbar">
            <table className="w-full text-xs min-w-[600px]">
              <thead className="bg-[var(--color-surface-container-low)]">
                <tr className="text-[10px] uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  <th scope="col" className="text-left font-extrabold px-4 py-2">
                    Customer
                  </th>
                  <th scope="col" className="text-right font-extrabold px-3 py-2">
                    Orders
                  </th>
                  <th scope="col" className="text-right font-extrabold px-3 py-2">
                    Spent
                  </th>
                  <th scope="col" className="text-right font-extrabold px-3 py-2">
                    Avg
                  </th>
                  <th scope="col" className="text-right font-extrabold px-4 py-2">
                    Last order
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => (
                  <tr key={c.phone} className="border-t border-[var(--color-outline-variant)]">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--color-on-surface)] truncate">
                          {c.name}
                        </span>
                        <span
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${
                            c.is_registered
                              ? "bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)]"
                              : "bg-[var(--color-surface-container-low)] border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)]"
                          }`}
                        >
                          <span
                            className="material-symbols-outlined text-[12px]"
                            aria-hidden="true"
                          >
                            {c.is_registered ? "verified_user" : "person"}
                          </span>
                          {c.is_registered ? "Registered" : "Guest"}
                        </span>
                      </div>
                      <a
                        href={`tel:${c.phone}`}
                        className="text-[11px] tabular-nums text-[var(--color-on-surface-variant)] hover:underline"
                      >
                        {c.phone}
                      </a>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-[var(--color-on-surface)]">
                      {formatInt(c.orders)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-extrabold text-[var(--color-on-surface)]">
                      {formatRs(c.spent)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[var(--color-on-surface)]">
                      {formatRs(c.orders > 0 ? c.spent / c.orders : 0)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--color-on-surface-variant)] whitespace-nowrap">
                      {timeAgo(c.last_order)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {list.length > visible.length && (
          <div className="px-4 py-3 border-t border-[var(--color-outline-variant)] text-center">
            <button
              type="button"
              onClick={() => setLimit((l) => l + PAGE)}
              className="px-4 py-2 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] text-xs font-bold text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] transition-colors cursor-pointer"
            >
              Show {Math.min(PAGE, list.length - visible.length)} more of {formatInt(list.length)}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
