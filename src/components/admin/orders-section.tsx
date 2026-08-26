"use client";

/**
 * The Orders section: filter pills, a sticky column strip, and the row list.
 *
 * The filter lives in the parent so other sections can deep-link into it (the
 * Overview's "Pending" tile jumps here pre-filtered). Which row is expanded is
 * local — nothing outside this list cares, and keeping it here means expanding a
 * row cannot re-render the rest of the dashboard.
 */

import { useMemo, useState } from "react";
import type { Order, OrderItem, OrderStatus, Rider } from "@/lib/supabase/database.types";
import { isWithRider, normalizePkPhone } from "@/lib/orders";
import { OrderRow, OrderRowHeader } from "./order-row";

export type OrderFilter =
  | "all"
  | "pending"
  | "preparing"
  | "ready"
  | "with_rider"
  | "completed"
  | "cancelled";

const FILTERS: { key: OrderFilter; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "receipt_long" },
  { key: "pending", label: "Pending", icon: "hourglass_top" },
  { key: "preparing", label: "Preparing", icon: "soup_kitchen" },
  { key: "ready", label: "Ready", icon: "checklist" },
  { key: "with_rider", label: "With Rider", icon: "delivery_dining" },
  { key: "completed", label: "Delivered", icon: "task_alt" },
  { key: "cancelled", label: "Cancelled", icon: "cancel" },
];

export function matchesFilter(status: OrderStatus, filter: OrderFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "with_rider":
      return isWithRider(status);
    case "completed":
      return status === "completed" || status === "delivered";
    default:
      return status === filter;
  }
}

export function OrdersSection({
  orders,
  itemsByOrder,
  riders,
  filter,
  onFilterChange,
  onPrint,
  onClearAll,
  clearing,
}: {
  orders: Order[];
  itemsByOrder: Map<string, OrderItem[]>;
  riders: Rider[];
  filter: OrderFilter;
  onFilterChange: (filter: OrderFilter) => void;
  onPrint: (order: Order, items: OrderItem[], width?: "80mm" | "58mm") => void;
  onClearAll: () => void;
  clearing?: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const map = new Map<OrderFilter, number>();
    for (const f of FILTERS) {
      map.set(
        f.key,
        orders.reduce((n, o) => (matchesFilter(o.status, f.key) ? n + 1 : n), 0)
      );
    }
    return map;
  }, [orders]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qPhone = q ? normalizePkPhone(q) : "";
    return orders.filter((o) => {
      if (!matchesFilter(o.status, filter)) return false;
      if (!q) return true;
      return (
        o.customer_name?.toLowerCase().includes(q) ||
        String(o.order_number).toLowerCase().includes(q) ||
        (qPhone.length > 3 && normalizePkPhone(o.customer_phone ?? "").includes(qPhone)) ||
        (o.customer_phone ?? "").includes(q)
      );
    });
  }, [orders, filter, query]);

  const toggle = (id: string) => setExpandedId((cur) => (cur === id ? null : id));

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[var(--color-on-surface-variant)]"
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone or order number"
            aria-label="Search orders"
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] text-sm font-medium text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        <button
          type="button"
          onClick={onClearAll}
          disabled={clearing || orders.length === 0}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#f2b8b5] bg-[#fdeceb] text-[#8f1d1d] font-extrabold text-xs hover:bg-[#fbdedc] transition-colors disabled:opacity-50 cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
            delete_sweep
          </span>
          {clearing ? "Clearing…" : "Clear All Orders"}
        </button>
      </div>

      {/* Horizontally scrollable on phones so every filter is one tap away. */}
      <div
        className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5"
        role="group"
        aria-label="Filter orders by status"
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = counts.get(f.key) ?? 0;
          const emphasise = f.key === "pending" && count > 0 && !active;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => onFilterChange(f.key)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border font-bold text-xs whitespace-nowrap transition-colors cursor-pointer ${
                active
                  ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white"
                  : emphasise
                  ? "bg-[#fff6e0] border-[#f2ce77] text-[#7a4d00] hover:bg-[#ffefc9]"
                  : "bg-[var(--color-surface-container-lowest)] border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                {f.icon}
              </span>
              {f.label}
              <span
                className={`tabular-nums font-extrabold px-1.5 py-0.5 rounded-md text-[10px] ${
                  active
                    ? "bg-white/20 text-white"
                    : "bg-[var(--color-surface-container)] text-[var(--color-on-surface)]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] overflow-hidden">
        <OrderRowHeader />

        {visible.length === 0 ? (
          <div className="py-14 px-4 text-center">
            <span
              className="material-symbols-outlined text-[40px] text-[var(--color-on-surface-variant)]"
              aria-hidden="true"
            >
              {query ? "search_off" : "receipt_long"}
            </span>
            <p className="mt-1.5 text-sm font-extrabold text-[var(--color-on-surface)]">
              {query ? "No matching orders" : "No orders in this view"}
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">
              {query
                ? "Try a different name, phone or order number."
                : "New orders appear here the moment they are placed."}
            </p>
          </div>
        ) : (
          <div>
            {visible.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                items={itemsByOrder.get(order.id) ?? []}
                riders={riders}
                expanded={expandedId === order.id}
                onToggle={toggle}
                onPrint={onPrint}
              />
            ))}
          </div>
        )}
      </div>

      {visible.length > 0 && (
        <p className="text-[11px] font-semibold text-[var(--color-on-surface-variant)] px-1">
          Showing {visible.length} of {orders.length} loaded orders
        </p>
      )}
    </div>
  );
}
