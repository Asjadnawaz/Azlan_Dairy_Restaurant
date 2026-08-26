/**
 * Discount codes.
 *
 * Deliberately a plain list rather than a table: there are two codes, they never
 * change per-customer, and a table would need RLS thinking to be safe. What
 * matters is that the *server* owns the arithmetic — this module is imported by
 * both the cart UI and POST /api/orders, so a tampered request cannot invent a
 * discount (see src/lib/cart-pricing.ts).
 */

export type Coupon = {
  code: string;
  /** Fraction of the subtotal, e.g. 0.1 for 10% off. */
  percentOff: number;
  label: string;
};

const COUPONS: Coupon[] = [
  { code: "AZLAN10", percentOff: 0.1, label: "10% off your order" },
  { code: "WELCOME10", percentOff: 0.1, label: "10% off — welcome!" },
];

/** Looks a code up, case- and whitespace-insensitively. */
export function findCoupon(code: string | null | undefined): Coupon | null {
  const normalized = (code ?? "").trim().toUpperCase();
  if (!normalized) return null;
  return COUPONS.find((c) => c.code === normalized) ?? null;
}
