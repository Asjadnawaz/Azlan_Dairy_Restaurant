"use client";

import { useState } from "react";
import { findCoupon, type Coupon } from "@/lib/coupons";

/**
 * The coupon input.
 *
 * It exists as its own component because the markup used to be pasted into both
 * the cart summary and the checkout summary — and had drifted: one Apply button
 * was `bg-[#FFC700] … hover:bg-blue-700`, so it turned from yellow to blue on
 * hover. Two copies, two behaviours, one of them wrong.
 *
 * The discount itself is never computed here. This only resolves a code to a
 * `Coupon`; `computeTotals` applies it, and POST /api/orders re-applies it
 * server-side from `coupon_code`, so the figure the customer sees and the figure
 * the shop charges come from the same function.
 */

export function CouponField({
  code,
  coupon,
  onApply,
  onClear,
}: {
  code: string;
  /** The coupon currently honoured, or null. */
  coupon: Coupon | null;
  onApply: (code: string) => void;
  onClear: () => void;
}) {
  const [draft, setDraft] = useState(code);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setError("Enter a code first");
      return;
    }
    if (!findCoupon(trimmed)) {
      // Naming a working code beats "invalid" — it is a discount, not a secret.
      setError("That code isn't valid. Try AZLAN10 for 10% off.");
      return;
    }
    setError(null);
    onApply(trimmed.toUpperCase());
  };

  if (coupon) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="material-symbols-outlined shrink-0 text-[18px] text-[#FFC700]">
            confirmation_number
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-black uppercase tracking-wide text-[#FFC700]">
              {coupon.code}
            </p>
            <p className="truncate text-[11px] font-medium text-zinc-300">{coupon.label}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setDraft("");
            setError(null);
            onClear();
          }}
          className="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center rounded-xl border border-zinc-800 bg-zinc-900 p-1.5 transition-colors focus-within:border-[#FFC700]">
        <input
          type="text"
          inputMode="text"
          autoComplete="off"
          placeholder="Coupon code"
          aria-label="Coupon code"
          aria-invalid={error ? true : undefined}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          className="w-full min-w-0 bg-transparent px-3 text-xs font-bold uppercase text-white placeholder-zinc-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={submit}
          className="shrink-0 rounded-lg bg-[#FFC700] px-3 py-1.5 text-[11px] font-black uppercase text-[#00230c] transition-colors hover:bg-amber-300 sm:px-4 sm:py-2 sm:text-xs"
        >
          Apply
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 px-1 text-[11px] font-semibold text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
