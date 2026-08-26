"use client";

import { useState } from "react";
import type { Order, OrderItem } from "@/lib/supabase/database.types";
import {
  RIDER_STEPS,
  actionIconFor,
  actionLabelFor,
  getMapsUrl,
  getStage,
  getWhatsAppUrl,
  isPickupOrder,
  minutesSince,
  parseOrderNote,
  splitAddress,
  stageStatusLabel,
  timeAgoUrdu,
} from "./rider-utils";

type Props = {
  /** Active orders only, in the order they should be paged through. */
  orders: Order[];
  index: number;
  onIndexChange: (index: number) => void;
  itemsMap: Record<string, OrderItem[]>;
  updatingId: string | null;
  /** Completes the current step. Stage 3 opens the confirmation dialog. */
  onAdvance: (order: Order) => void;
  /** Pulses the pager once when a new order lands while another is open. */
  pagerFlash: boolean;
};

const EYEBROW =
  "text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--r-muted)]";

export function RiderOrderFocus({
  orders,
  index,
  onIndexChange,
  itemsMap,
  updatingId,
  onAdvance,
  pagerFlash,
}: Props) {
  // Keyed by order id, so paging to another order collapses the list again.
  const [itemsOpenFor, setItemsOpenFor] = useState<string | null>(null);

  if (orders.length === 0) {
    return (
      <div className="px-1 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[var(--r-panel)] border border-[var(--r-line)] flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-[32px] text-[var(--r-muted)]">
            two_wheeler
          </span>
        </div>
        <div className="space-y-1.5">
          <h2 className="font-integral text-lg">Abhi koi delivery nahi</h2>
          <p className="text-sm text-[var(--r-muted)] max-w-[16rem] mx-auto leading-relaxed">
            Naya order aayega to ghanti bajegi. Screen khuli rehne dein.
          </p>
        </div>
      </div>
    );
  }

  const order = orders[Math.min(index, orders.length - 1)];
  const items = itemsMap[order.id] || [];
  const parsed = parseOrderNote(order.customer_note);
  const isPickup = isPickupOrder(order, parsed);
  const stage = getStage(order.status);
  const step = RIDER_STEPS[stage - 1];
  const busy = updatingId === order.id;
  const itemsOpen = itemsOpenFor === order.id;

  const waitedMins = minutesSince(order.placed_at);
  const ageColor =
    waitedMins >= 45
      ? "var(--r-alert)"
      : waitedMins >= 18
        ? "var(--r-late)"
        : "var(--r-muted)";

  // Wrapping rather than disabling: on a bike, a dead button is worse than a loop.
  const go = (delta: number) =>
    onIndexChange((index + delta + orders.length) % orders.length);

  return (
    <div className="space-y-4">
      {/* Pager — only earns its space when there is more than one order */}
      {orders.length > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p
            className={`${EYEBROW} tnum ${pagerFlash ? "rider-pager-pulse" : ""}`}
          >
            Order {index + 1} / {orders.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Pichla order"
              onClick={() => go(-1)}
              className="w-12 h-12 rounded-xl bg-[var(--r-raised)] border border-[var(--r-line)] flex items-center justify-center cursor-pointer active:opacity-70"
            >
              <span className="material-symbols-outlined text-[22px]">
                chevron_left
              </span>
            </button>
            <button
              type="button"
              aria-label="Agla order"
              onClick={() => go(1)}
              className="w-12 h-12 rounded-xl bg-[var(--r-raised)] border border-[var(--r-line)] flex items-center justify-center cursor-pointer active:opacity-70"
            >
              <span className="material-symbols-outlined text-[22px]">
                chevron_right
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Order identity */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="rider-num text-xl">#{order.order_number}</h2>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[var(--r-raised)] text-[var(--r-muted)]">
            {stageStatusLabel(order.status)}
          </span>
          <span
            className="text-xs font-bold tnum"
            style={{ color: ageColor }}
            title={`Order ${timeAgoUrdu(order.placed_at)} aaya tha`}
          >
            {timeAgoUrdu(order.placed_at)}
          </span>
        </div>
      </div>

      {/* Cash slab — the one number that must never be misread */}
      {parsed.isCod ? (
        <div
          key={`cash-${order.id}`}
          className="rider-slab-rise rounded-3xl bg-[var(--r-cash)] text-[var(--r-bg)] px-5 py-4"
        >
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em]">
            Cash lena hai
          </p>
          <p
            className="rider-num leading-[0.95] mt-1.5"
            style={{ fontSize: "clamp(2.5rem, 12vw, 3.5rem)" }}
          >
            Rs {order.total.toLocaleString()}
          </p>
        </div>
      ) : (
        <div
          key={`paid-${order.id}`}
          className="rider-slab-rise rounded-3xl border border-[var(--r-line)] px-5 py-4"
        >
          <p className={EYEBROW}>Online paid</p>
          <p className="font-integral text-2xl mt-1.5">Kuch nahi lena</p>
          <p className="text-xs text-[var(--r-muted)] mt-1 tnum">
            Order Rs {order.total.toLocaleString()} — paisa aa chuka hai
          </p>
        </div>
      )}

      {/* Three steps, in the order they happen */}
      <div>
        <div className="flex items-end gap-1.5">
          {RIDER_STEPS.map((s) => {
            const done = s.stage < stage;
            const current = s.stage === stage;
            return (
              <div key={s.stage} className="flex-1 min-w-0">
                <div className="h-1.5 rounded-full overflow-hidden bg-[var(--r-raised)]">
                  {(done || current) && (
                    <div
                      key={`${order.id}-${stage}`}
                      className={`h-full ${current ? "rider-step-fill" : ""}`}
                      style={{
                        backgroundColor: s.color,
                        opacity: done ? 0.4 : 1,
                      }}
                    />
                  )}
                </div>
                <p
                  className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.1em] truncate"
                  style={{ color: current ? s.color : "var(--r-muted)" }}
                >
                  {s.stage}. {s.label}
                </p>
              </div>
            );
          })}
        </div>
        <p className="text-sm mt-3" style={{ color: step.color }}>
          Ab: {step.hint}
        </p>
      </div>

      {/* Where to go, and who to call */}
      <div className="rounded-3xl bg-[var(--r-panel)] border border-[var(--r-line)] p-4 space-y-3.5">
        <div>
          <p className={EYEBROW}>Customer</p>
          <p className="text-base font-bold mt-1">{order.customer_name}</p>
          <p className="text-sm text-[var(--r-muted)] tnum">
            {order.customer_phone}
          </p>
        </div>

        <div className="border-t border-[var(--r-line)] pt-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={EYEBROW}>{isPickup ? "Pickup" : "Address"}</p>
              <p className="text-base font-bold leading-snug mt-1">
                {isPickup
                  ? "Customer khud shop se le ga"
                  : splitAddress(order.customer_address).street}
              </p>
            </div>
            {!isPickup && (order.delivery_distance_km ?? 0) > 0 && (
              <span className="shrink-0 text-xs font-bold tnum text-[var(--r-muted)] px-2.5 py-1 rounded-full bg-[var(--r-raised)]">
                {order.delivery_distance_km} km
              </span>
            )}
          </div>
        </div>

        {parsed.customNote && (
          <p
            className="text-sm font-semibold leading-snug rounded-2xl px-3.5 py-3 border"
            style={{
              color: "var(--r-late)",
              borderColor: "color-mix(in srgb, var(--r-late) 45%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--r-late) 12%, transparent)",
            }}
          >
            Note: {parsed.customNote}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          {!isPickup && (
            <a
              href={getMapsUrl(order)}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-14 rounded-2xl flex items-center justify-center gap-2 font-integral text-sm active:opacity-80"
              style={{ backgroundColor: "var(--r-nav)", color: "var(--r-bg)" }}
            >
              <span className="material-symbols-outlined text-[20px]">
                near_me
              </span>
              <span>Raasta</span>
            </a>
          )}
          <a
            href={`tel:${order.customer_phone}`}
            className={`min-h-14 rounded-2xl border border-[var(--r-line)] bg-[var(--r-raised)] flex items-center justify-center gap-2 font-integral text-sm active:opacity-80 ${
              isPickup ? "col-span-2" : ""
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">call</span>
            <span>Call</span>
          </a>
        </div>

        <a
          href={getWhatsAppUrl(order, parsed.isCod)}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-12 rounded-2xl border border-[var(--r-line)] flex items-center justify-center gap-2 text-sm font-bold text-[var(--r-muted)] active:opacity-70"
        >
          <span className="material-symbols-outlined text-[18px]">chat</span>
          <span>WhatsApp par batayein</span>
        </a>
      </div>

      {/* The shop already bagged the order, so the list stays out of the way */}
      {items.length > 0 && (
        <div className="rounded-3xl bg-[var(--r-panel)] border border-[var(--r-line)] overflow-hidden">
          <button
            type="button"
            aria-expanded={itemsOpen}
            aria-controls={`rider-items-${order.id}`}
            onClick={() => setItemsOpenFor(itemsOpen ? null : order.id)}
            className="w-full min-h-14 px-4 flex items-center justify-between gap-3 cursor-pointer"
          >
            <span className="text-sm font-bold tnum">
              {items.length} item{items.length > 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1.5 text-[var(--r-muted)]">
              <span className="text-xs font-bold">
                {itemsOpen ? "band karein" : "dekhein"}
              </span>
              <span
                className="material-symbols-outlined text-[20px] transition-transform"
                style={{ transform: itemsOpen ? "rotate(180deg)" : "none" }}
              >
                expand_more
              </span>
            </span>
          </button>

          {itemsOpen && (
            <ul
              id={`rider-items-${order.id}`}
              className="px-4 pb-4 space-y-2 border-t border-[var(--r-line)] pt-3"
            >
              {items.map((it, i) => (
                <li
                  key={`${order.id}-${it.id || it.name_snapshot}-${i}`}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <span className="min-w-0">
                    <strong className="rider-num">
                      {it.quantity}×
                    </strong>{" "}
                    {it.name_snapshot}
                  </span>
                  <span className="shrink-0 tnum text-[var(--r-muted)]">
                    Rs {it.line_total}
                  </span>
                </li>
              ))}
              {parsed.unavailableTag && (
                <li className="text-xs text-[var(--r-muted)] pt-1">
                  Na mile to: {parsed.unavailableTag}
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      {/* Clears the fixed action bar */}
      <div aria-hidden className="h-24" />

      <div className="rider-action-bar fixed bottom-0 left-0 right-0 z-30 bg-[var(--r-bg)] border-t border-[var(--r-line)] px-4 pt-3">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            disabled={busy}
            onClick={() => onAdvance(order)}
            className="w-full min-h-16 rounded-2xl font-integral text-base flex items-center justify-center gap-2.5 cursor-pointer active:opacity-85 disabled:opacity-60"
            style={{ backgroundColor: step.color, color: "var(--r-bg)" }}
          >
            {busy ? (
              <>
                <span className="material-symbols-outlined text-[22px] animate-spin">
                  progress_activity
                </span>
                <span>Ruk jayein…</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[22px]">
                  {actionIconFor(stage)}
                </span>
                <span>{actionLabelFor(stage, parsed.isCod)}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
