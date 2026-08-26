"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Order, OrderItem, OrderStatus, Settings } from "@/lib/supabase/database.types";
import {
  clockTime,
  getMapsUrl,
  isDoneStatus,
  parseOrderNote,
  isPickupOrder,
  splitAddress,
  timeAgo,
} from "@/lib/orders";
import { formatRupees } from "@/lib/cart-pricing";
import {
  isOrderHandled,
  markOrderHandled,
  snoozeOrder,
  subscribeReviewed,
} from "@/lib/reviews-local";
import dynamic from "next/dynamic";
import type { ReviewableItem } from "./review-prompt-modal";

const ReviewPromptModal = dynamic(
  () => import("./review-prompt-modal").then((m) => m.ReviewPromptModal),
  { ssr: false }
);

/**
 * Order tracking.
 *
 * What changed and why:
 *
 * - **It fits a phone.** The progress rail was five `w-12 h-12` circles joined
 *   by `w-16` connectors inside an `overflow-x-auto`, so it scrolled sideways on
 *   every handset and the current step was often off-screen. It is now a
 *   vertical timeline below `md` and horizontal from `md` up, and the timeline
 *   and the step rail — which used to duplicate each other — are one thing.
 * - **One subscription.** `currentStatus` was in the effect's dependency list,
 *   so every status change tore down the realtime channel and the 6-second
 *   interval and built new ones; the interval also `return`ed early on a
 *   finished order instead of stopping. Now the channel is created once, and the
 *   poll exists only as a fallback and clears itself when the order is done.
 * - **Real data.** Shop phone from `settings` instead of a hardcoded number,
 *   delivery fee from the order instead of `|| 60`, the GPS suffix split out of
 *   the address with `splitAddress`, and pickup orders no longer show a delivery
 *   block. All of that is shared with /admin and /rider via src/lib/orders.ts.
 * - The review prompt is the same modal the rest of the site uses, so a rating
 *   goes through /api/reviews and is actually stored — the old inline section
 *   inserted straight from the browser, which RLS silently rejected.
 */

interface OrderTrackerProps {
  order: Order;
  items: OrderItem[];
  settings: Settings | null;
}

type Step = {
  label: string;
  icon: string;
  /** Statuses that mean "this step is the current one". */
  statuses: OrderStatus[];
  at: (order: Order) => string | null;
};

const STEPS: Step[] = [
  {
    label: "Order placed",
    icon: "receipt_long",
    statuses: ["pending"],
    at: (o) => o.placed_at,
  },
  {
    label: "Preparing",
    icon: "outdoor_grill",
    statuses: ["preparing"],
    at: (o) => o.preparing_at || o.confirmed_at,
  },
  {
    label: "Ready",
    icon: "shopping_bag",
    statuses: ["ready"],
    at: (o) => o.ready_at,
  },
  {
    label: "On the way",
    icon: "delivery_dining",
    statuses: ["picked_up", "delivering", "out_for_delivery"],
    at: (o) => o.delivering_at || o.picked_up_at || null,
  },
  {
    label: "Delivered",
    icon: "check_circle",
    statuses: ["completed", "delivered"],
    at: (o) => o.completed_at,
  },
];

/** Where the given status sits on the rail. -1 for cancelled. */
function stepIndexFor(status: OrderStatus): number {
  if (status === "cancelled") return -1;
  const index = STEPS.findIndex((step) => step.statuses.includes(status));
  return index === -1 ? 0 : index;
}

const HEADLINES: Record<string, { title: string; sub: string }> = {
  pending: { title: "Order received", sub: "The kitchen is confirming it now." },
  preparing: { title: "Your food is cooking", sub: "Made fresh to order." },
  ready: { title: "Ready to go", sub: "Waiting for a rider to pick it up." },
  picked_up: { title: "On the way", sub: "Your rider has your order." },
  delivering: { title: "On the way", sub: "Your rider has your order." },
  out_for_delivery: { title: "On the way", sub: "Your rider has your order." },
  completed: { title: "Delivered", sub: "Enjoy your food!" },
  delivered: { title: "Delivered", sub: "Enjoy your food!" },
  cancelled: { title: "Order cancelled", sub: "Nothing has been charged." },
};

/** Realtime can drop; this is the backstop, not the mechanism. */
const POLL_MS = 20000;

export function OrderTracker({ order: initialOrder, items, settings }: OrderTrackerProps) {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [reviewOpen, setReviewOpen] = useState(false);
  const pollRef = useRef<number | null>(null);

  // Whether this order has already been reviewed/snoozed, read from
  // localStorage through an external store so it never diverges between the
  // server render (always "not handled") and the client, and so it updates the
  // moment the modal records a rating.
  const handled = useSyncExternalStore(
    subscribeReviewed,
    () => isOrderHandled(initialOrder.id),
    () => false
  );

  const status = order.status;
  const finished = isDoneStatus(status) || status === "cancelled";
  const stepIndex = stepIndexFor(status);
  const parsedNote = parseOrderNote(order.customer_note);
  const isPickup = isPickupOrder(order, parsedNote);
  const { street, pin } = splitAddress(order.customer_address);
  const headline = HEADLINES[status] ?? HEADLINES.pending;

  const shopPhone = settings?.phone || settings?.whatsapp_number || "";

  const reviewableItems: ReviewableItem[] = items
    .filter((item): item is OrderItem & { item_id: string } => Boolean(item.item_id))
    .filter(
      (item, index, all) => all.findIndex((i) => i.item_id === item.item_id) === index
    )
    .map((item) => ({ itemId: item.item_id, name: item.name_snapshot }));

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // One channel, one interval, created once. `order` is deliberately not a
  // dependency — the callbacks update it, and listing it here is what made the
  // old version rebuild its subscription on every status change.
  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`order-tracker:${initialOrder.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${initialOrder.id}`,
        },
        (payload) => {
          const next = payload.new as Order;
          if (next?.status) setOrder((prev) => ({ ...prev, ...next }));
        }
      )
      .subscribe();

    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/${initialOrder.id}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { order?: Order };
        if (data.order?.status) {
          setOrder((prev) =>
            data.order!.status === prev.status ? prev : { ...prev, ...data.order! }
          );
        }
      } catch {
        // Offline or a hiccup — realtime or the next tick will catch up.
      }
    };

    pollRef.current = window.setInterval(() => {
      void poll();
    }, POLL_MS);

    return () => {
      supabase.removeChannel(channel);
      stopPolling();
    };
  }, [initialOrder.id, stopPolling]);

  // Nothing left to poll for once the order is finished.
  useEffect(() => {
    if (finished) stopPolling();
  }, [finished, stopPolling]);

  const canReview =
    isDoneStatus(status) && reviewableItems.length > 0 && !handled;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-5 sm:pt-8">
      {/* ------------------------------------------------------------- nav */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-container)] px-3.5 py-2 text-xs font-bold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-highest)]"
        >
          <span className="material-symbols-outlined text-[17px]">arrow_back</span>
          My orders
        </Link>
        {shopPhone && (
          <a
            href={`tel:${shopPhone}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:brightness-110"
          >
            <span className="material-symbols-outlined text-[17px]">call</span>
            Call the shop
          </a>
        )}
      </div>

      {/* --------------------------------------------------------- headline */}
      <header
        className={`rounded-3xl border p-5 sm:p-6 ${
          status === "cancelled"
            ? "border-red-200 bg-red-50"
            : isDoneStatus(status)
              ? "border-emerald-200 bg-emerald-50"
              : "border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
              Order {order.order_number}
            </p>
            <h1 className="mt-1 text-xl font-black leading-tight text-[var(--color-on-surface)] sm:text-2xl">
              {headline.title}
            </h1>
            <p className="mt-1 text-xs text-[var(--color-on-surface-variant)] sm:text-sm">
              {headline.sub}
            </p>
          </div>
          <span
            className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${
              status === "cancelled"
                ? "bg-red-100 text-red-700"
                : isDoneStatus(status)
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
            }`}
          >
            <span className="material-symbols-outlined text-[24px]">
              {status === "cancelled"
                ? "cancel"
                : STEPS[Math.max(0, stepIndex)].icon}
            </span>
          </span>
        </div>

        <dl className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-black/5 pt-3 text-xs">
          <div className="flex items-center gap-1.5">
            <dt className="font-bold text-[var(--color-on-surface-variant)]">Placed</dt>
            <dd className="font-extrabold text-[var(--color-on-surface)]">
              {timeAgo(order.placed_at)}
            </dd>
          </div>
          {!finished && order.eta_minutes > 0 && (
            <div className="flex items-center gap-1.5">
              <dt className="font-bold text-[var(--color-on-surface-variant)]">
                Estimated
              </dt>
              <dd className="font-extrabold text-[var(--color-on-surface)]">
                {order.eta_minutes} min
              </dd>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <dt className="font-bold text-[var(--color-on-surface-variant)]">
              {parsedNote.isCod ? "Cash on delivery" : "Paid"}
            </dt>
            <dd className="font-extrabold text-[var(--color-on-surface)]">
              {formatRupees(order.total)}
            </dd>
          </div>
        </dl>
      </header>

      {/* ---------------------------------------------------------- progress */}
      {status !== "cancelled" && (
        <section
          aria-label="Order progress"
          className="mt-4 rounded-3xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-5 sm:p-6"
        >
          {/* Mobile: a vertical timeline that always fits. */}
          <ol className="relative space-y-0 md:hidden">
            {STEPS.map((step, index) => {
              const isPast = index < stepIndex;
              const isCurrent = index === stepIndex;
              const at = step.at(order);
              const isLast = index === STEPS.length - 1;

              return (
                <li key={step.label} className="relative flex gap-3.5 pb-5 last:pb-0">
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 rounded-full ${
                        isPast ? "bg-emerald-500" : "bg-[var(--color-outline-variant)]"
                      }`}
                    />
                  )}
                  <span
                    className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      isPast
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                          ? "bg-[var(--color-primary)] text-white ring-4 ring-[var(--color-primary)]/15"
                          : "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[17px]">
                      {isPast ? "check" : step.icon}
                    </span>
                  </span>
                  <div className="min-w-0 pt-1">
                    <p
                      className={`text-sm font-extrabold leading-tight ${
                        isPast || isCurrent
                          ? "text-[var(--color-on-surface)]"
                          : "text-[var(--color-on-surface-variant)]"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-[var(--color-on-surface-variant)]">
                      {at ? clockTime(at) : isCurrent ? "In progress" : "Pending"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Desktop: the horizontal rail, with no scroll container. */}
          <ol className="hidden md:grid md:grid-cols-5 md:gap-2">
            {STEPS.map((step, index) => {
              const isPast = index < stepIndex;
              const isCurrent = index === stepIndex;
              const at = step.at(order);

              return (
                <li key={step.label} className="relative flex flex-col items-center">
                  {index < STEPS.length - 1 && (
                    <span
                      aria-hidden="true"
                      className={`absolute left-1/2 top-5 h-0.5 w-full rounded-full ${
                        isPast ? "bg-emerald-500" : "bg-[var(--color-outline-variant)]"
                      }`}
                    />
                  )}
                  <span
                    className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full ${
                      isPast
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                          ? "bg-[var(--color-primary)] text-white ring-4 ring-[var(--color-primary)]/15"
                          : "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {isPast ? "check" : step.icon}
                    </span>
                  </span>
                  <p
                    className={`mt-2 text-center text-xs font-extrabold leading-tight ${
                      isPast || isCurrent
                        ? "text-[var(--color-on-surface)]"
                        : "text-[var(--color-on-surface-variant)]"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-[var(--color-on-surface-variant)]">
                    {at ? clockTime(at) : isCurrent ? "In progress" : "—"}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {status === "cancelled" && order.cancellation_reason && (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800">
          <span className="font-black">Reason: </span>
          {order.cancellation_reason}
        </p>
      )}

      {/* ------------------------------------------------------------ review */}
      {canReview && (
        <section className="mt-4 rounded-3xl border border-amber-300/80 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 p-5 shadow-xs">
          <div className="flex items-start gap-3.5">
            <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-900 shadow-sm shadow-amber-500/20">
              <span className="material-symbols-outlined text-[24px]">rate_review</span>
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-200/70 px-2.5 py-0.5 rounded-full">
                  Customer Feedback
                </span>
              </div>
              <h2 className="text-base font-black text-[var(--color-on-surface)]">
                How was your meal?
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-on-surface-variant)]">
                Rate what you ordered — it only takes a few seconds and helps other customers order with confidence.
              </p>
              <button
                type="button"
                onClick={() => setReviewOpen(true)}
                className="btn-shine mt-3.5 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-xs font-black text-white shadow-sm hover:shadow-md transition-all hover:brightness-110 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-[17px] text-[#FFC700] filled">star</span>
                Rate {reviewableItems.length === 1 ? "this item" : "your order"}
              </button>
            </div>
          </div>
        </section>
      )}

      {isDoneStatus(status) && handled && !reviewOpen && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs font-bold text-emerald-800 shadow-xs">
          <span className="material-symbols-outlined text-[18px] filled text-emerald-600">verified</span>
          <span>Thank you for reviewing your order!</span>
        </div>
      )}

      {/* ------------------------------------------------------------- items */}
      <section className="mt-4 rounded-3xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-5 sm:p-6">
        <h2 className="text-sm font-black uppercase tracking-wide text-[var(--color-on-surface)]">
          Your order
        </h2>

        <ul className="mt-3 divide-y divide-[var(--color-outline-variant)]/60">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="shrink-0 rounded-md bg-[var(--color-surface-container)] px-1.5 py-0.5 text-[11px] font-black text-[var(--color-on-surface-variant)]">
                  ×{item.quantity}
                </span>
                <span className="truncate text-sm font-bold text-[var(--color-on-surface)]">
                  {item.name_snapshot}
                </span>
              </div>
              <span className="shrink-0 text-sm font-extrabold text-[var(--color-on-surface)]">
                {formatRupees(item.line_total)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-3 space-y-1.5 border-t border-[var(--color-outline-variant)] pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--color-on-surface-variant)]">Subtotal</dt>
            <dd className="font-bold">{formatRupees(order.subtotal)}</dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <dt>Discount</dt>
              <dd className="font-bold">−{formatRupees(order.discount)}</dd>
            </div>
          )}
          {!isPickup && (
            <div className="flex justify-between">
              <dt className="text-[var(--color-on-surface-variant)]">
                Delivery
                {order.delivery_distance_km
                  ? ` (${order.delivery_distance_km.toFixed(1)} km)`
                  : ""}
              </dt>
              <dd className="font-bold">
                {order.delivery_fee > 0 ? formatRupees(order.delivery_fee) : "Free"}
              </dd>
            </div>
          )}
          <div className="flex justify-between border-t border-[var(--color-outline-variant)] pt-2 text-base">
            <dt className="font-black">Total</dt>
            <dd className="font-black text-[var(--color-primary)]">
              {formatRupees(order.total)}
            </dd>
          </div>
        </dl>
      </section>

      {/* ---------------------------------------------------------- delivery */}
      <section className="mt-4 rounded-3xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-5 sm:p-6">
        <h2 className="text-sm font-black uppercase tracking-wide text-[var(--color-on-surface)]">
          {isPickup ? "Pickup details" : "Delivery details"}
        </h2>

        <div className="mt-3 space-y-3 text-sm">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined mt-0.5 text-[18px] text-[var(--color-on-surface-variant)]">
              person
            </span>
            <div className="min-w-0">
              <p className="font-bold text-[var(--color-on-surface)]">
                {order.customer_name}
              </p>
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                {order.customer_phone}
              </p>
            </div>
          </div>

          {!isPickup && (
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined mt-0.5 text-[18px] text-[var(--color-on-surface-variant)]">
                location_on
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-[var(--color-on-surface)]">
                  {street || order.customer_address}
                </p>
                {pin && (
                  <a
                    href={getMapsUrl(order)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[var(--color-primary)] hover:underline"
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      my_location
                    </span>
                    View the pin you dropped
                  </a>
                )}
              </div>
            </div>
          )}

          {parsedNote.customNote && (
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined mt-0.5 text-[18px] text-[var(--color-on-surface-variant)]">
                sticky_note_2
              </span>
              <p className="min-w-0 flex-1 italic text-[var(--color-on-surface-variant)]">
                &ldquo;{parsedNote.customNote}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Help — customer contact */}
        {shopPhone && (
          <div className="mt-4 flex flex-col gap-2 border-t border-[var(--color-outline-variant)] pt-4 sm:flex-row">
            <a
              href={`tel:${shopPhone}`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[var(--color-outline-variant)] px-4 py-2.5 text-xs font-bold text-[var(--color-on-surface)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              <span className="material-symbols-outlined text-[17px]">call</span>
              Call about this order
            </a>
          </div>
        )}
      </section>

      <div className="mt-5 text-center">
        <Link
          href="/#menu"
          className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-black text-white transition-all hover:brightness-110 active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[19px]">restaurant_menu</span>
          Order again
        </Link>
      </div>

      {reviewOpen && (
        <ReviewPromptModal
          target={{
            orderId: order.id,
            orderNumber: order.order_number,
            items: reviewableItems,
          }}
          onClose={() => {
            // "Not now" — postponed, not answered. The card stays on this page.
            snoozeOrder(order.id);
            setReviewOpen(false);
          }}
          onCompleted={(reviewedItemIds) => {
            markOrderHandled(order.id, reviewedItemIds);
            setReviewOpen(false);
          }}
        />
      )}
    </div>
  );
}
