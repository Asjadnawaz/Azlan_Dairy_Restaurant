/**
 * Order helpers shared by /admin and /rider.
 *
 * A note on order status: the Postgres `order_status` enum only contains
 * pending | preparing | ready | picked_up | delivering | completed | cancelled.
 * `out_for_delivery` and `delivered` appear in the TS union but never come back
 * from the database — PATCH /api/orders/[id] maps them onto delivering/completed.
 * Both portals therefore group statuses instead of testing them one at a time,
 * which is what the exported status sets below are for.
 *
 * This module is the single source of truth: src/components/rider/rider-utils.ts
 * re-exports everything here so the rider portal keeps its existing imports, and
 * the admin order card/row read an order exactly the same way the rider does.
 * Keep it free of React and of browser-only APIs — the stats endpoint imports it
 * on the server.
 */

import type { Order, OrderStatus } from "@/lib/supabase/database.types";

/* -------------------------------------------------------------------------- */
/* Order notes                                                                */
/* -------------------------------------------------------------------------- */

export type ParsedOrderNote = {
  orderTypeTag: "PICKUP" | "DELIVERY" | null;
  paymentTag: "COD" | "BANK_TRANSFER" | "ONLINE" | null;
  unavailableTag: string | null;
  emailTag: string | null;
  customNote: string | null;
  isCod: boolean;
};

/**
 * Splits the tagged note the cart writes (see src/app/cart/page.tsx:301) into
 * its parts.
 */
export function parseOrderNote(noteStr: string | null): ParsedOrderNote {
  if (!noteStr) {
    return {
      orderTypeTag: null,
      paymentTag: null,
      unavailableTag: null,
      emailTag: null,
      customNote: null,
      isCod: true,
    };
  }

  let remaining = noteStr;

  let orderTypeTag: ParsedOrderNote["orderTypeTag"] = null;
  const typeMatch = remaining.match(/\[(PICKUP|DELIVERY)\]/i);
  if (typeMatch) {
    orderTypeTag = typeMatch[1].toUpperCase() as "PICKUP" | "DELIVERY";
    remaining = remaining.replace(typeMatch[0], "");
  }

  let paymentTag: ParsedOrderNote["paymentTag"] = null;
  const payMatch = remaining.match(/\[(COD|BANK_TRANSFER|ONLINE)\]/i);
  if (payMatch) {
    paymentTag = payMatch[1].toUpperCase() as "COD" | "BANK_TRANSFER" | "ONLINE";
    remaining = remaining.replace(payMatch[0], "");
  }

  let unavailableTag: string | null = null;
  const unavailMatch = remaining.match(
    /\[(?:If unavailable|UNAVAILABLE ITEM):\s*([^\]]+)\]/i
  );
  if (unavailMatch) {
    unavailableTag = unavailMatch[1].trim();
    remaining = remaining.replace(unavailMatch[0], "");
  }

  let emailTag: string | null = null;
  const emailMatch = remaining.match(/\[(?:Email|EMAIL):\s*([^\]]+)\]/i);
  if (emailMatch) {
    emailTag = emailMatch[1].trim();
    remaining = remaining.replace(emailMatch[0], "");
  }

  const customNote = remaining.trim() || null;

  return {
    orderTypeTag,
    paymentTag,
    unavailableTag,
    emailTag,
    customNote,
    // Untagged legacy orders are treated as cash — the safer default, since a
    // rider who expects cash and is told "already paid" loses nothing, but the
    // reverse loses the order total.
    isCod: paymentTag !== "BANK_TRANSFER" && paymentTag !== "ONLINE",
  };
}

export function isPickupOrder(order: Order, parsed: ParsedOrderNote): boolean {
  return (
    parsed.orderTypeTag === "PICKUP" ||
    (order.customer_address?.toLowerCase().includes("store pickup") ?? false)
  );
}

/* -------------------------------------------------------------------------- */
/* Time                                                                       */
/* -------------------------------------------------------------------------- */

export function minutesSince(dateStr: string): number {
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(ms / 60000));
}

/** Short English age for the admin screens, e.g. "just now", "18m", "2h". */
export function timeAgo(dateStr: string): string {
  const mins = minutesSince(dateStr);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function clockTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** True when the timestamp falls on today's local calendar date. */
export function isToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** The moment an order counts as finished — completion time, else when placed. */
export function completionTime(order: Order): string {
  return order.completed_at || order.placed_at;
}

/* -------------------------------------------------------------------------- */
/* Contact + navigation                                                       */
/* -------------------------------------------------------------------------- */

/** Turns a local Pakistani number into the 92XXXXXXXXXX form wa.me expects. */
export function normalizePkPhone(phone: string): string {
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("0")) {
    clean = `92${clean.substring(1)}`;
  } else if (!clean.startsWith("92")) {
    clean = `92${clean}`;
  }
  return clean;
}

/**
 * The cart appends " [GPS: 24.87654, 67.19876]" to the address
 * (src/app/cart/page.tsx). Those digits are the most accurate destination
 * available, but as text they bury the street someone actually has to read, so
 * they are split apart here: the street goes on the card, the pin goes into the
 * maps link.
 */
export function splitAddress(address: string | null): {
  street: string;
  pin: { lat: number; lng: number } | null;
} {
  if (!address) return { street: "", pin: null };

  const match = address.match(
    /\s*\[GPS:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/i
  );
  if (!match) return { street: address.trim(), pin: null };

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  return {
    street: address.replace(match[0], "").replace(/[,\s]+$/, "").trim(),
    pin: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null,
  };
}

export function getMapsUrl(order: Order): string {
  // A dropped pin beats a typed address in Malir, where many lanes are unnamed.
  const pin = order.delivery_coordinates ?? splitAddress(order.customer_address).pin;
  const destination = pin
    ? `${pin.lat},${pin.lng}`
    : encodeURIComponent(`${splitAddress(order.customer_address).street}, Karachi`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

/* -------------------------------------------------------------------------- */
/* Status groups                                                              */
/* -------------------------------------------------------------------------- */

/** In a rider's hands — the admin can no longer advance these from the kitchen. */
export const RIDER_STATUSES: readonly OrderStatus[] = [
  "picked_up",
  "out_for_delivery",
  "delivering",
];

/** Money collected, order closed. */
export const DONE_STATUSES: readonly OrderStatus[] = ["delivered", "completed"];

/** Anything still owed to a customer. */
export const ACTIVE_STATUSES: readonly OrderStatus[] = [
  "pending",
  "preparing",
  "ready",
  "picked_up",
  "delivering",
  "out_for_delivery",
];

export function isWithRider(status: OrderStatus): boolean {
  return RIDER_STATUSES.includes(status);
}

export function isDoneStatus(status: OrderStatus): boolean {
  return DONE_STATUSES.includes(status);
}

export function isActiveOrder(order: Order): boolean {
  return ACTIVE_STATUSES.includes(order.status);
}

export function isFinishedOrder(order: Order): boolean {
  return order.status === "completed" || order.status === "delivered";
}
