"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { formatRupees } from "@/lib/cart-pricing";
import type { Confirmation } from "@/lib/cart-storage";

/* -------------------------------------------------------------------------- */
/* Pieces                                                                     */
/* -------------------------------------------------------------------------- */

export function CartHeader({
  activeStep,
  itemCount,
  showSteps,
  onStep,
}: {
  activeStep: "cart" | "checkout";
  itemCount: number;
  showSteps: boolean;
  onStep: (step: "cart" | "checkout") => void;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:mb-6 sm:gap-4 sm:pb-6 md:flex-row md:items-center md:justify-between">
      <h1 className="font-integral text-2xl uppercase tracking-tight text-slate-950 sm:text-4xl">
        {activeStep === "cart" ? (
          <>
            Your <span className="italic text-green-700">Cart</span>
          </>
        ) : (
          <>
            Secure <span className="italic text-green-700">Checkout</span>
          </>
        )}
      </h1>

      {showSteps && (
        <nav
          aria-label="Checkout progress"
          className="flex items-center gap-1.5 self-start rounded-2xl border border-slate-200 bg-slate-100 p-1 sm:gap-2 sm:p-1.5 md:self-auto"
        >
          <StepButton
            index={1}
            label={`Cart (${itemCount})`}
            active={activeStep === "cart"}
            onClick={() => onStep("cart")}
          />
          <span aria-hidden className="shrink-0 text-xs font-extrabold text-slate-300">
            →
          </span>
          <StepButton
            index={2}
            label="Checkout"
            active={activeStep === "checkout"}
            onClick={() => onStep("checkout")}
          />
        </nav>
      )}
    </div>
  );
}

export function StepButton({
  index,
  label,
  active,
  onClick,
}: {
  index: number;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "step" : undefined}
      className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-bold uppercase transition-all sm:gap-2 sm:px-4 sm:py-2.5 sm:text-xs ${
        active
          ? "bg-[#00230c] text-white shadow-md"
          : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
      }`}
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#FFC700] text-[10px] font-black text-slate-950 sm:h-5 sm:w-5 sm:text-[11px]">
        {index}
      </span>
      {label}
    </button>
  );
}

export function PlaceOrderButton({
  onClick,
  submitting,
  isStoreOpen,
  total,
  compact = false,
}: {
  onClick: () => void;
  submitting: boolean;
  isStoreOpen: boolean;
  total?: number;
  compact?: boolean;
}) {
  const disabled = submitting || !isStoreOpen;
  return (
    <button
      type="button"
      onClick={onClick}
      // Deliberately not disabled on an incomplete form: pressing it explains
      // what is missing and scrolls there, which a dead grey button cannot.
      disabled={disabled}
      aria-busy={submitting}
      className={`flex w-full items-center justify-center gap-2 rounded-full text-center font-black uppercase tracking-wider shadow-lg transition-all ${
        compact ? "px-5 py-3.5 text-xs" : "py-4 text-base"
      } ${
        disabled
          ? "cursor-not-allowed bg-slate-300 text-slate-500"
          : "bg-gradient-to-r from-[#FFC700] via-[#ffd736] to-[#FFC700] text-[#00230C] shadow-amber-500/25 hover:scale-[1.02] hover:shadow-amber-400/40 active:scale-[0.98]"
      }`}
    >
      {submitting ? (
        <>
          <span className="material-symbols-outlined animate-spin text-[18px]">
            progress_activity
          </span>
          {compact ? "Placing…" : "Placing your order…"}
        </>
      ) : !isStoreOpen ? (
        "Store Closed"
      ) : (
        <>
          Place Order
          {total !== undefined && (
            <span className="font-black">· {formatRupees(total)}</span>
          )}
        </>
      )}
    </button>
  );
}

export function EmptyCart() {
  return (
    <div className="mx-auto my-12 max-w-xl rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center shadow-sm sm:p-12">
      <span className="material-symbols-outlined mb-4 text-[72px] text-slate-400">
        shopping_bag
      </span>
      <h2 className="mb-2 text-2xl font-bold text-slate-900">Your cart is empty</h2>
      <p className="mb-6 text-sm text-slate-600">
        Nothing added yet — the menu is one tap away.
      </p>
      <Link
        href="/#menu"
        className="inline-flex items-center justify-center rounded-full bg-[#00230c] px-8 py-3.5 text-sm font-extrabold text-white shadow-md transition-all hover:bg-[#073615]"
      >
        Browse Menu
      </Link>
    </div>
  );
}

/** Matches the real layout's shape so nothing jumps when the cart rehydrates. */
export function CartSkeleton() {
  return (
    <div className="min-h-screen animate-pulse bg-white px-4 pt-6 pb-20 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-6">
          <div className="h-8 w-48 rounded-lg bg-slate-200 sm:h-10 sm:w-64" />
          <div className="hidden h-11 w-64 rounded-2xl bg-slate-100 md:block" />
        </div>
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-8">
              <div className="mb-6 h-7 w-40 rounded bg-slate-200" />
              <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-24 rounded-2xl bg-slate-100 sm:h-28" />
                ))}
              </div>
            </div>
          </div>
          <div className="hidden lg:col-span-4 lg:block">
            <div className="h-80 rounded-3xl bg-slate-200/80" />
          </div>
        </div>
      </div>
      <span className="sr-only">Loading your cart…</span>
    </div>
  );
}

export function ConfirmationModal({
  confirmed,
  onClose,
}: {
  confirmed: Confirmation;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-confirmed-title"
    >
      <div className="animate-scale-in relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-2xl sm:p-8">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#FFC700] text-slate-950 shadow-lg shadow-amber-500/30">
          <span className="material-symbols-outlined text-[48px]">done</span>
        </div>

        <h2
          id="order-confirmed-title"
          className="text-2xl font-black uppercase tracking-tight text-slate-950"
        >
          Order placed
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-600">
          Thanks{confirmed.name ? `, ${confirmed.name}` : ""}! We&apos;re on it.
        </p>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-bold">
          <span>Order</span>
          <span className="text-sm font-black text-slate-950">{confirmed.orderNumber}</span>
        </div>

        <div className="mt-6 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-sm font-semibold">
          <div className="flex justify-between">
            <span className="text-slate-500">Items</span>
            <span>
              {confirmed.itemCount} {confirmed.itemCount === 1 ? "item" : "items"}
            </span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="shrink-0 text-slate-500">Address</span>
            <span className="max-w-[220px] break-words text-right text-xs">
              {confirmed.address}
            </span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-extrabold">
            <span>Total</span>
            <span className="font-black text-amber-600">{formatRupees(confirmed.total)}</span>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          {confirmed.orderId && (
            <Link
              href={`/orders/${confirmed.orderId}`}
              onClick={onClose}
              className="flex-1 rounded-full bg-[#FFC700] py-3.5 text-center text-sm font-extrabold uppercase text-slate-950 shadow-md transition-colors hover:bg-amber-400"
            >
              Track Order
            </Link>
          )}
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-200 px-6 py-3.5 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
