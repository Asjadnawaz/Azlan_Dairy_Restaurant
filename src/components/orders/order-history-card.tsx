"use client";

import Link from "next/link";
import { MenuImage } from "@/components/menu/menu-image";
import type { StoredOrder } from "@/lib/reviews-local";
import { isOrderComplete, StatusBadge } from "./order-status-badge";

/**
 * One row of the /orders history: gradient header, item thumbnails and the
 * invoice / reorder / track actions.
 */
export function OrderHistoryCard({
  order,
  trackHref,
  onInvoice,
  onReorder,
}: {
  order: StoredOrder;
  trackHref: string;
  onInvoice: () => void;
  onReorder: () => void;
}) {
  const completed = isOrderComplete(order.status);
  return (
    <div className="bg-[var(--color-surface-container-lowest)] rounded-2xl border border-[var(--color-surface-variant)] overflow-hidden custom-shadow">
      {/* Order header */}
      <div
        className="px-5 py-4 flex items-center justify-between gap-4"
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary) 0%, #0a3318 100%)",
        }}
      >
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-mint-accent)]">
              Order
            </span>
            <StatusBadge status={order.status} />
          </div>
          <span className="text-lg font-extrabold text-white tracking-tight mt-0.5">
            #{order.orderNumber}
          </span>
          <span className="text-xs text-white/60">
            {new Date(order.timestamp ?? 0).toLocaleString("en-PK", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/60 font-medium">Total Paid</p>
          <p
            className="text-2xl font-extrabold"
            style={{ color: "var(--color-cta-yellow)" }}
          >
            Rs. {order.total}
          </p>
        </div>
      </div>

      {/* Items list */}
      {order.items && order.items.length > 0 ? (
        <div className="divide-y divide-[var(--color-surface-variant)]">
          {order.items.map((item, idx) => (
            <div
              key={item.id || idx}
              className="flex items-center gap-3 px-5 py-3"
            >
              <MenuImage
                src={item.image_path}
                alt={item.name}
                width={48}
                height={48}
                className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[var(--color-surface-variant)]"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-[var(--color-on-surface)] truncate">
                  {item.name}
                </p>
                <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                  Rs. {item.price} × {item.quantity}
                </p>
              </div>
              <p className="font-bold text-sm text-[var(--color-primary)] shrink-0">
                Rs. {item.price * item.quantity}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-5 py-4 text-sm text-[var(--color-on-surface-variant)]">
          Item details not available for this order.
        </div>
      )}

      {/* Card Actions: Invoice & Reorder if Complete; Track Order if In Progress */}
      <div className="px-5 py-4 bg-[var(--color-surface-container-low)] flex items-center justify-end gap-3">
        {completed ? (
          <>
            <button
              onClick={onInvoice}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)] text-xs font-bold hover:bg-[var(--color-primary)] hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
              Invoice
            </button>
            <button
              onClick={onReorder}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold hover:bg-[var(--color-primary-container)] transition-colors custom-shadow"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              Reorder
            </button>
          </>
        ) : (
          <Link
            href={trackHref}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-bold hover:bg-[var(--color-primary-container)] transition-colors custom-shadow"
          >
            <span className="material-symbols-outlined text-[18px]">map</span>
            Track Order
          </Link>
        )}
      </div>
    </div>
  );
}
