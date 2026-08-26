"use client";

import { useEffect, useRef } from "react";
import type { Order } from "@/lib/supabase/database.types";

type Props = {
  order: Order;
  isCod: boolean;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * The one irreversible tap in the rider flow gets a confirmation, because the
 * cash figure is the thing that must not be wrong. Follows the accessible modal
 * pattern already used in src/components/admin/order-card.tsx.
 */
export function RiderConfirmDialog({
  order,
  isCod,
  saving,
  onCancel,
  onConfirm,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onCancel]);

  return (
    <div
      className="rider-shell fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/85 animate-fade-in"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rider-confirm-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-[var(--r-panel)] border border-[var(--r-line)] text-[var(--r-text)] p-5 space-y-4 animate-scale-in"
      >
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--r-muted)]">
            Confirm karein
          </p>
          <h2
            id="rider-confirm-title"
            className="font-integral text-xl leading-tight mt-1"
          >
            Order <span className="rider-num">#{order.order_number}</span> de
            diya?
          </h2>
          <p className="text-sm text-[var(--r-muted)] mt-1">
            {order.customer_name}
          </p>
        </div>

        {isCod ? (
          <div className="rounded-2xl bg-[var(--r-cash)] text-[var(--r-bg)] p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em]">
              Cash le liya?
            </p>
            <p className="rider-num text-3xl leading-none mt-1.5">
              Rs {order.total.toLocaleString()}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--r-line)] p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--r-muted)]">
              Online paid
            </p>
            <p className="font-integral text-lg leading-tight mt-1.5">
              Kuch nahi lena
            </p>
          </div>
        )}

        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 min-h-12 rounded-2xl border border-[var(--r-line)] text-[var(--r-muted)] text-sm font-bold cursor-pointer active:opacity-70"
          >
            Nahi, wapis
          </button>
          <button
            ref={confirmRef}
            type="button"
            disabled={saving}
            onClick={onConfirm}
            className="flex-[1.4] min-h-12 rounded-2xl bg-[var(--r-done)] text-[var(--r-bg)] font-integral text-sm cursor-pointer active:opacity-85 disabled:opacity-60"
          >
            {saving ? "Save ho raha…" : "Haan, de diya"}
          </button>
        </div>
      </div>
    </div>
  );
}
