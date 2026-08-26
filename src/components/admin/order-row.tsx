"use client";

/**
 * The horizontal order row — the dashboard's densest surface.
 *
 * One row is one order, scannable left-to-right in the same order a human asks
 * the questions: who and where → what → how much → what do I do about it. Tall
 * cards in a 3-up grid fit about four orders on a laptop; these fit fifteen, and
 * the expensive parts (the Leaflet map, item thumbnails) only mount for the one
 * row that is expanded.
 *
 * Below `lg` the identical component reflows into a stacked card. There is no
 * separate mobile row, so the two can never drift apart.
 */

import { memo } from "react";
import type { Order, OrderItem, Rider } from "@/lib/supabase/database.types";
import { isPickupOrder, parseOrderNote, splitAddress, timeAgo } from "@/lib/orders";
import {
  ADMIN_STEPS,
  OrderCard,
  StatusChip,
  useOrderActions,
} from "./order-card";

/** lg+ column template. The row and its header strip share it, so they align. */
const GRID =
  "lg:grid lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.5fr)_minmax(0,0.9fr)_minmax(0,2.0fr)] lg:items-center lg:gap-3";

/** Sticky column labels. lg+ only — the stacked card labels itself inline. */
export function OrderRowHeader() {
  return (
    <div
      className={`hidden ${GRID} sticky top-0 z-10 px-3 py-2 bg-[var(--color-surface-container-low)] border-b border-[var(--color-outline-variant)] text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-on-surface-variant)]`}
    >
      <span>Customer &amp; Address</span>
      <span>Items</span>
      <span className="text-right">Total</span>
      <span className="text-right">Status &amp; Actions</span>
    </div>
  );
}

function OrderRowInner({
  order,
  items,
  riders,
  expanded,
  onToggle,
  onPrint,
}: {
  order: Order;
  items: OrderItem[];
  riders: Rider[];
  expanded: boolean;
  onToggle: (orderId: string) => void;
  onPrint?: (order: Order, items: OrderItem[], width?: "80mm" | "58mm") => void;
}) {
  const { updating, updateStatus } = useOrderActions(order, riders);

  const parsed = parseOrderNote(order.customer_note);
  const isPickup = isPickupOrder(order, parsed);
  const { street } = splitAddress(order.customer_address);

  const stepIndex = ADMIN_STEPS.findIndex((s) => s.status === order.status);
  const nextStep = stepIndex >= 0 ? ADMIN_STEPS[stepIndex + 1] : undefined;

  const isDone =
    order.status === "completed" || order.status === "delivered" || order.status === "cancelled";
  const assignedRider = riders.find(
    (r) => r.id === order.rider_id || r.user_id === order.rider_id
  );

  const unitCount = items.reduce((sum, i) => sum + (i.quantity ?? 0), 0);
  const itemSummary = items.map((i) => `${i.quantity}× ${i.name_snapshot}`).join(", ");

  return (
    <div
      className={`border-b border-[var(--color-outline-variant)] transition-colors ${
        expanded
          ? "bg-[var(--color-surface-container-low)]"
          : "bg-[var(--color-surface-container-lowest)] hover:bg-[var(--color-surface-container-low)]/60"
      } ${isDone ? "opacity-70 hover:opacity-100" : ""}`}
    >
      {/* Pending orders get a left rail. Colour is the second cue here — the
          status chip already says "Pending" in words with an icon. */}
      <div
        className={`border-l-[3px] ${
          order.status === "pending"
            ? "border-l-[#c98a00]"
            : order.status === "cancelled"
            ? "border-l-[#c14a4a]"
            : "border-l-transparent"
        }`}
      >
        <div className={`px-3 py-2.5 ${GRID}`}>
          {/* 1 — who & where ------------------------------------------------ */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-1.5 py-0.5 rounded-md bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] text-[11px] font-extrabold tabular-nums text-[var(--color-on-surface)]">
                {order.order_number}
              </span>
              <span className="font-extrabold text-sm text-[var(--color-on-surface)] truncate">
                {order.customer_name}
              </span>
              <span className="lg:hidden ml-auto">
                <StatusChip status={order.status} size="xs" />
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--color-on-surface-variant)] min-w-0">
              <a
                href={`tel:${order.customer_phone}`}
                className="font-bold tabular-nums hover:underline shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {order.customer_phone}
              </a>
              <span aria-hidden="true">·</span>
              <span className="truncate">{isPickup ? "Store pickup" : street}</span>
            </div>
          </div>

          {/* 2 — what ------------------------------------------------------- */}
          <div className="min-w-0 mt-2 lg:mt-0">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-extrabold text-[var(--color-on-surface)] tabular-nums">
                {items.length > 0 ? `${unitCount} item${unitCount === 1 ? "" : "s"}` : "—"}
              </span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] border-[var(--color-outline-variant)]">
                <span className="material-symbols-outlined text-[12px]" aria-hidden="true">
                  {isPickup ? "storefront" : "local_shipping"}
                </span>
                {isPickup ? "Pickup" : "Delivery"}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-[var(--color-on-surface-variant)] truncate">
              {itemSummary || "No items recorded"}
            </p>
          </div>

          {/* 3 — money ------------------------------------------------------ */}
          <div className="mt-2 lg:mt-0 lg:text-right flex items-center gap-2 lg:block">
            <span className="text-sm font-extrabold text-[var(--color-on-surface)] tabular-nums">
              Rs. {order.total}
            </span>
            <span className="lg:mt-0.5 lg:block text-[10px] font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wide">
              {parsed.isCod ? "Cash on delivery" : "Bank transfer"}
            </span>
          </div>

          {/* 4 — status & actions ------------------------------------------- */}
          <div className="mt-2.5 lg:mt-0 flex items-center gap-1.5 lg:justify-end">
            <div className="hidden lg:flex flex-col items-end gap-0.5 mr-1 min-w-0">
              {order.status !== "pending" && <StatusChip status={order.status} />}
              <span className="text-[10px] font-semibold text-[var(--color-on-surface-variant)] whitespace-nowrap">
                {assignedRider && !isDone ? assignedRider.name : timeAgo(order.placed_at)}
              </span>
            </div>
            <span className="lg:hidden text-[11px] font-semibold text-[var(--color-on-surface-variant)] mr-auto">
              {timeAgo(order.placed_at)}
            </span>

            {nextStep && !isDone && (
              <button
                type="button"
                onClick={() => void updateStatus(nextStep.status)}
                disabled={updating}
                title={`Mark as ${nextStep.label}`}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--color-primary)] text-white font-extrabold text-[11px] hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                  {nextStep.icon}
                </span>
                {nextStep.label}
              </button>
            )}

            <button
              type="button"
              onClick={() => onPrint?.(order, items)}
              title="Print receipt"
              aria-label={`Print receipt for order ${order.order_number}`}
              className="w-8 h-8 shrink-0 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] flex items-center justify-center transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                print
              </span>
            </button>

            <button
              type="button"
              onClick={() => onToggle(order.id)}
              aria-expanded={expanded}
              aria-label={`${expanded ? "Hide" : "Show"} details for order ${order.order_number}`}
              className="w-8 h-8 shrink-0 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container)] flex items-center justify-center transition-colors cursor-pointer"
            >
              <span
                className={`material-symbols-outlined text-[18px] transition-transform ${
                  expanded ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              >
                expand_more
              </span>
            </button>
          </div>
        </div>

        {expanded && (
          <div className="px-3 pb-4 animate-fade-in">
            <div className="rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-4">
              <p className="sr-only">Details for order {order.order_number}</p>
              <OrderCard
                order={order}
                items={items}
                riders={riders}
                onPrint={onPrint}
                variant="detail"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Memoised so a realtime update to one order re-renders one row, not the whole
 * list. `items` is handed in from a `Map` built once per orders/lineItems change,
 * so its identity is stable between unrelated updates.
 */
export const OrderRow = memo(OrderRowInner);
