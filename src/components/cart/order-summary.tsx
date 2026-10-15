"use client";

import type { ReactNode } from "react";
import { formatRupees, type OrderTotals } from "@/lib/cart-pricing";
import type { Coupon } from "@/lib/coupons";
import { CouponField } from "./coupon-field";

/**
 * The dark totals panel, used by both steps.
 *
 * The two steps had their own copy of this, and they disagreed: the checkout one
 * printed the literal string `"Rs. 60"` whenever no map pin had been dropped yet,
 * so the customer read a delivery fee that was not the one in `deliveryFee`.
 * Everything here comes from `OrderTotals` — the same object POST /api/orders
 * recomputes — so there is nothing left to drift.
 */

export type OrderSummaryProps = {
  title: string;
  totals: OrderTotals;
  coupon: Coupon | null;
  couponCode: string;
  onApplyCoupon: (code: string) => void;
  onClearCoupon: () => void;
  /** Shown as a line-item list above the coupon field; omit on step 1. */
  lines?: { id: string; name: string; price: number; quantity: number }[];
  isPickup?: boolean;
  /** Road distance, for the "2.40 km" chip. */
  distanceKm?: number;
  /** True while the fee is still an estimate (no pin dropped yet). */
  feeIsEstimate?: boolean;
  children?: ReactNode;
};

export function OrderSummary({
  title,
  totals,
  coupon,
  couponCode,
  onApplyCoupon,
  onClearCoupon,
  lines,
  isPickup = false,
  distanceKm = 0,
  feeIsEstimate = false,
  children,
}: OrderSummaryProps) {
  return (
    <div className="space-y-4 rounded-3xl border border-zinc-800 bg-[#023020] p-4 text-white shadow-2xl sm:space-y-6 sm:p-8">
      <h2 className="text-lg font-black uppercase tracking-wide text-white sm:text-2xl">
        {title}
      </h2>

      {lines && lines.length > 0 && (
        <div className="space-y-2 border-b border-zinc-800 pb-4 text-xs font-medium sm:pb-5 sm:text-sm">
          {lines.map((line) => (
            <div key={line.id} className="flex items-center justify-between gap-3 text-zinc-300">
              <span className="min-w-0 truncate">
                {line.name}{" "}
                <span className="font-bold text-zinc-500">×{line.quantity}</span>
              </span>
              <span className="shrink-0 font-bold text-white">
                {formatRupees(line.price * line.quantity)}
              </span>
            </div>
          ))}
        </div>
      )}

      <CouponField
        code={couponCode}
        coupon={coupon}
        onApply={onApplyCoupon}
        onClear={onClearCoupon}
      />

      <div className="space-y-2.5 pt-1 text-xs font-semibold sm:space-y-3 sm:text-sm">
        <div className="flex items-center justify-between text-zinc-300">
          <span>Subtotal</span>
          <span className="font-bold text-white">{formatRupees(totals.subtotal)}</span>
        </div>

        <div className="flex items-center justify-between gap-3 text-zinc-300">
          <div className="flex min-w-0 items-center gap-2">
            <span>{isPickup ? "Pickup" : "Delivery"}</span>
            {!isPickup && distanceKm > 0 && (
              <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-400">
                {distanceKm.toFixed(2)} km
              </span>
            )}
          </div>
          <span className="shrink-0 font-bold text-white">
            {isPickup ? "Free" : formatRupees(totals.deliveryFee)}
          </span>
        </div>

        {!isPickup && feeIsEstimate && (
          <p className="text-[11px] font-medium leading-snug text-zinc-400">
            Estimated — the exact fee is set once you drop your map pin.
          </p>
        )}

        {totals.discount > 0 && (
          <div className="flex items-center justify-between text-amber-400">
            <span>Discount{coupon ? ` (${coupon.code})` : ""}</span>
            <span className="font-bold">− {formatRupees(totals.discount)}</span>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-zinc-800 pt-3 sm:pt-4">
          <span className="text-sm font-black uppercase text-[#FFC700] sm:text-lg">Total</span>
          <span className="text-xl font-black text-[#FFC700] sm:text-3xl">
            {formatRupees(totals.total)}
          </span>
        </div>
      </div>

      {children}
    </div>
  );
}
