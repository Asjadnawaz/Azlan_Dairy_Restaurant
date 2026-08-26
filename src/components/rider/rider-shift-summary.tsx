"use client";

import type { Order } from "@/lib/supabase/database.types";
import {
  clockTime,
  completionTime,
  isFinishedOrder,
  isToday,
  parseOrderNote,
} from "./rider-utils";

const EYEBROW =
  "text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--r-muted)]";

/**
 * End-of-shift readout. Only today's deliveries count, and only cash orders add
 * to the tally — that figure is what the rider physically hands over, so mixing
 * prepaid totals into it (as the old dashboard did) overstated it.
 */
export function RiderShiftSummary({ orders }: { orders: Order[] }) {
  const today = orders
    .filter((o) => isFinishedOrder(o) && isToday(completionTime(o)))
    .sort(
      (a, b) =>
        new Date(completionTime(b)).getTime() -
        new Date(completionTime(a)).getTime()
    );

  const rows = today.map((order) => ({
    order,
    isCod: parseOrderNote(order.customer_note).isCod,
  }));

  const cashTotal = rows
    .filter((r) => r.isCod)
    .reduce((sum, r) => sum + (r.order.total || 0), 0);
  const onlineCount = rows.filter((r) => !r.isCod).length;

  const dateLabel = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-integral text-lg">Aaj Ka Kaam</h2>
        <span className="text-xs font-bold text-[var(--r-muted)] tnum">
          {dateLabel}
        </span>
      </div>

      <div className="rounded-3xl bg-[var(--r-cash)] text-[var(--r-bg)] px-5 py-4">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.22em]">
          Cash aap ke paas
        </p>
        <p
          className="rider-num leading-[0.95] mt-1.5"
          style={{ fontSize: "clamp(2.25rem, 11vw, 3rem)" }}
        >
          Rs {cashTotal.toLocaleString()}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[var(--r-panel)] border border-[var(--r-line)] p-4">
          <p className={EYEBROW}>Deliveries</p>
          <p className="rider-num text-2xl mt-1">{today.length}</p>
        </div>
        <div className="rounded-2xl bg-[var(--r-panel)] border border-[var(--r-line)] p-4">
          <p className={EYEBROW}>Online paid</p>
          <p className="rider-num text-2xl mt-1">{onlineCount}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-[var(--r-muted)] leading-relaxed px-1 py-6 text-center">
          Aaj abhi tak koi delivery poori nahi hui. Jo aaj deliver karenge wo
          yahan aa jayega.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map(({ order, isCod }) => (
            <li
              key={order.id}
              className="rounded-2xl bg-[var(--r-panel)] border border-[var(--r-line)] px-4 py-3.5 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="rider-num text-sm">
                  #{order.order_number}
                </p>
                <p className="text-xs text-[var(--r-muted)] truncate mt-0.5">
                  {order.customer_name} · {clockTime(order.completed_at)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className="rider-num text-base"
                  style={{ color: isCod ? "var(--r-cash)" : "var(--r-muted)" }}
                >
                  Rs {order.total.toLocaleString()}
                </p>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--r-muted)]">
                  {isCod ? "cash" : "online"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
