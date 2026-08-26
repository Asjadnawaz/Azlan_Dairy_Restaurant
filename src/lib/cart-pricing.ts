/**
 * Order arithmetic — one implementation, used by both sides.
 *
 * The cart used to compute the discount in the browser and POST the resulting
 * `total`, which the API stored as-is. That meant anyone could send
 * `{ total: 1 }` and the shop would print a receipt for it. Now
 * `computeTotals()` lives here, the cart renders what it returns, and
 * POST /api/orders re-derives the same figures from the line items before
 * writing the row — so a tampered request is corrected, not trusted.
 */

import { findCoupon, type Coupon } from "@/lib/coupons";

export type PricingLine = {
  /** Menu item id; `null` for a line whose product has since been removed. */
  id?: string | null;
  name: string;
  price: number;
  quantity: number;
};

export type OrderTotals = {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  /** The coupon that was actually honoured, or null. */
  coupon: Coupon | null;
  itemCount: number;
};

export type PricingInput = {
  items: PricingLine[];
  /** Delivery fee before the pickup waiver. */
  deliveryFee?: number | null;
  couponCode?: string | null;
  /** Pickup orders never pay delivery. */
  isPickup?: boolean;
};

/** Rupees only — the shop never quotes paisa. */
function rupees(n: number): number {
  return Math.max(0, Math.round(Number.isFinite(n) ? n : 0));
}

export function computeTotals({
  items,
  deliveryFee = 0,
  couponCode = null,
  isPickup = false,
}: PricingInput): OrderTotals {
  let subtotal = 0;
  let itemCount = 0;

  for (const line of items) {
    const qty = Math.max(0, Math.trunc(Number(line.quantity) || 0));
    const price = rupees(Number(line.price));
    subtotal += price * qty;
    itemCount += qty;
  }
  subtotal = rupees(subtotal);

  // An empty cart cannot earn a discount, and a coupon never applies to the
  // delivery fee — only to the food.
  const coupon = itemCount > 0 ? findCoupon(couponCode) : null;
  const discount = coupon ? rupees(subtotal * coupon.percentOff) : 0;

  const fee = isPickup ? 0 : rupees(Number(deliveryFee ?? 0));
  const total = rupees(subtotal - discount + fee);

  return { subtotal, discount, deliveryFee: fee, total, coupon, itemCount };
}

/** "Rs. 1,480" — the one money formatter the customer site uses. */
export function formatRupees(n: number): string {
  return `Rs. ${rupees(n).toLocaleString("en-PK")}`;
}
