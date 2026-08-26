/**
 * Shared helpers for the rider portal.
 *
 * Everything an order means the same way on both portals — note parsing, address
 * splitting, phone normalising, status grouping — now lives in src/lib/orders.ts
 * and is re-exported below, so the rider and admin screens can never drift apart
 * again. What stays in this file is genuinely rider-only: Roman Urdu phrasing, the
 * three-stage delivery model, the chime, and the toast placement.
 *
 * A note on order status: the Postgres `order_status` enum only contains
 * pending | preparing | ready | picked_up | delivering | completed | cancelled.
 * `out_for_delivery` and `delivered` appear in the TS union but never come back
 * from the database — PATCH /api/orders/[id] maps them onto delivering/completed.
 * The rider UI works off the real enum and only ever sends real enum values.
 */

import type { Order, OrderStatus } from "@/lib/supabase/database.types";
import { minutesSince, normalizePkPhone } from "@/lib/orders";

export type { ParsedOrderNote } from "@/lib/orders";
export {
  parseOrderNote,
  isPickupOrder,
  minutesSince,
  clockTime,
  isToday,
  completionTime,
  normalizePkPhone,
  splitAddress,
  getMapsUrl,
  isActiveOrder,
  isFinishedOrder,
} from "@/lib/orders";

/* -------------------------------------------------------------------------- */
/* Time, in Roman Urdu                                                        */
/* -------------------------------------------------------------------------- */

/** Short Roman Urdu age, e.g. "abhi", "18 min", "2 ghante". */
export function timeAgoUrdu(dateStr: string): string {
  const mins = minutesSince(dateStr);
  if (mins < 1) return "abhi";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ghante`;
  return `${Math.floor(hrs / 24)} din`;
}

/** Seconds since a timestamp, phrased for the "last synced" readout. */
export function syncAgoUrdu(at: number | null): string {
  if (!at) return "—";
  const secs = Math.max(0, Math.floor((Date.now() - at) / 1000));
  if (secs < 10) return "abhi update hua";
  if (secs < 60) return `${secs} sec pehle`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min pehle`;
  return `${Math.floor(mins / 60)} ghante pehle`;
}

/* -------------------------------------------------------------------------- */
/* Contact                                                                    */
/* -------------------------------------------------------------------------- */

export function getWhatsAppUrl(order: Order, isCod: boolean): string {
  const paymentText = isCod
    ? `Cash: Rs. ${order.total}`
    : "Payment already paid online";
  const msg =
    `Assalam o Alaikum ${order.customer_name}! Main Azlan Fast Food & BBQ Point se ` +
    `aap ka Order #${order.order_number} (${paymentText}) le kar nikal chuka hoon. ` +
    `Main jald aap ke address par pohnch raha hoon.`;
  return `https://wa.me/${normalizePkPhone(order.customer_phone)}?text=${encodeURIComponent(msg)}`;
}

/* -------------------------------------------------------------------------- */
/* Delivery stages                                                            */
/* -------------------------------------------------------------------------- */

export type RiderStage = 1 | 2 | 3;

export type RiderStep = {
  stage: RiderStage;
  /** Short label for the stepper — fits three across a 360px screen. */
  label: string;
  /** What the rider has to do at this stage. */
  hint: string;
  /** CSS custom property holding this stage's colour. */
  color: string;
};

export const RIDER_STEPS: readonly RiderStep[] = [
  { stage: 1, label: "UTHAO", hint: "Shop se order uthao", color: "var(--r-shop)" },
  { stage: 2, label: "RASTA", hint: "Customer ke paas jao", color: "var(--r-nav)" },
  { stage: 3, label: "DE DIYA", hint: "Order deliver karo", color: "var(--r-done)" },
];

/** Which of the three steps the rider still has to complete. */
export function getStage(status: OrderStatus): RiderStage {
  if (status === "picked_up") return 2;
  if (status === "delivering" || status === "out_for_delivery") return 3;
  return 1;
}

/** The status to send when the rider finishes the current step. */
export function nextStatusFor(stage: RiderStage): OrderStatus {
  if (stage === 1) return "picked_up";
  if (stage === 2) return "delivering";
  return "completed";
}

/**
 * Label for the sticky primary action — the completion of the current step.
 *
 * Punctuation here is deliberately limited to the comma: this text renders in
 * Integral CF, whose bundled DEMO build substitutes an ornament for dashes and
 * most symbols (see the .rider-num comment in globals.css).
 */
export function actionLabelFor(stage: RiderStage, isCod: boolean): string {
  if (stage === 1) return "SHOP SE UTHA LIYA";
  if (stage === 2) return "RASTE MEIN HOON";
  return isCod ? "DE DIYA, CASH MIL GAYA" : "DE DIYA, ORDER POORA";
}

export function actionIconFor(stage: RiderStage): string {
  if (stage === 1) return "takeout_dining";
  if (stage === 2) return "delivery_dining";
  return "task_alt";
}

/** Where the order is right now, for the status pill. */
export function stageStatusLabel(status: OrderStatus): string {
  if (status === "picked_up") return "Utha liya";
  if (status === "delivering" || status === "out_for_delivery") return "Raste mein";
  if (status === "ready") return "Shop par tayyar";
  return "Ban raha hai";
}

/* -------------------------------------------------------------------------- */
/* New-order chime                                                            */
/* -------------------------------------------------------------------------- */

/**
 * One AudioContext for the whole session.
 *
 * The previous implementation created a fresh context per chime and never closed
 * it; Chrome caps a page at roughly six, so the alert went silent after six
 * orders. Mobile browsers also start a context `suspended` until a user gesture,
 * which is why primeRiderChime() runs on the rider's first tap.
 */
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioCtx) return audioCtx;

  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;

  try {
    audioCtx = new Ctor();
  } catch {
    return null;
  }
  return audioCtx;
}

/** Unlocks audio playback. Call from a real user gesture. */
export function primeRiderChime(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
}

/**
 * A three-note rising chime, loud enough to carry over traffic. Triangle wave
 * rather than sine — it has more presence through a phone speaker in a pocket.
 */
export function playRiderChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const emit = () => {
    try {
      const notes = [587.33, 880, 1174.66]; // D5 → A5 → D6
      notes.forEach((freq, i) => {
        const at = ctx.currentTime + i * 0.13;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, at);
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.32, at + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(at);
        osc.stop(at + 0.32);
      });
    } catch {
      // Audio is a nicety; the toast and vibration still fire.
    }
  };

  if (ctx.state === "suspended") {
    void ctx.resume().then(emit).catch(() => {});
  } else {
    emit();
  }
}

export function vibrate(pattern: number[]): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern);
  }
}

/* -------------------------------------------------------------------------- */
/* Toasts                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Rider toasts sit at the top. The app-wide Toaster in src/app/layout.tsx is
 * bottom-right, which would cover the sticky action button — the one control the
 * rider needs while riding.
 */
export const RIDER_TOAST = { position: "top-center", duration: 3000 } as const;
