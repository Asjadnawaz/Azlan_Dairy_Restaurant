"use client";

import { MenuImage } from "@/components/menu/menu-image";
import Link from "next/link";
import { formatRupees } from "@/lib/cart-pricing";
import type { CartItem } from "@/lib/cart-store";

/**
 * The editable line-item list — step 1's left column.
 *
 * Pulled out of the 1,100-line page so the cart view and the checkout view are
 * two small components instead of two halves of one giant conditional. Purely
 * presentational: every mutation is a callback the page owns.
 */

export function CartItems({
  items,
  itemCount,
  onInc,
  onDec,
  onRemove,
  onClear,
}: {
  items: CartItem[];
  itemCount: number;
  onInc: (id: string) => void;
  onDec: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-md sm:p-8">
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4 sm:pb-5">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
            <h2 className="whitespace-nowrap text-xl font-black uppercase tracking-wide text-slate-950 sm:text-2xl">
              Cart Items
            </h2>
            <span className="shrink-0 rounded-full bg-[#00230c] px-2.5 py-1.5 text-[10px] font-black text-[#FFC700] shadow-xs sm:px-4 sm:text-xs">
              {itemCount} {itemCount === 1 ? "Item" : "Items"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-rose-200/80 bg-rose-50/60 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 shadow-xs transition-all hover:bg-rose-600 hover:text-white sm:px-3.5 sm:py-1.5 sm:text-xs"
          >
            <span className="material-symbols-outlined text-[14px] sm:text-[16px]">
              delete_sweep
            </span>
            Clear All
          </button>
        </div>

        <ul className="space-y-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="group flex flex-col justify-between gap-3 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 transition-all duration-300 hover:border-emerald-500/30 hover:bg-white hover:shadow-lg hover:shadow-emerald-900/5 sm:flex-row sm:items-center sm:gap-4 sm:p-5"
            >
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <MenuImage
                  src={item.image_path}
                  alt={item.name}
                  width={88}
                  height={88}
                  sizes="88px"
                  className="h-16 w-16 shrink-0 rounded-2xl object-cover shadow-sm ring-1 ring-slate-200/70 transition-all duration-300 group-hover:ring-emerald-500/40 sm:h-20 sm:w-20"
                />
                <div className="min-w-0 space-y-1">
                  <h3 className="truncate text-base font-bold leading-tight text-slate-900 transition-colors group-hover:text-[#00230c] sm:text-lg">
                    {item.name}
                  </h3>
                  <span className="inline-flex items-center rounded-full border border-emerald-200/50 bg-emerald-100/80 px-2.5 py-0.5 text-xs font-extrabold text-emerald-900">
                    {formatRupees(item.price)}
                    <span className="ml-1 text-[10px] font-medium text-emerald-700">/ unit</span>
                  </span>
                </div>
              </div>

              <div className="flex w-full items-center justify-between gap-2 border-t border-slate-200/50 pt-3 sm:w-auto sm:justify-end sm:gap-5 sm:border-t-0 sm:pt-0">
                <div className="flex shrink-0 items-center rounded-full border border-slate-200 bg-white p-0.5 shadow-xs sm:p-1">
                  <button
                    type="button"
                    onClick={() => onDec(item.id)}
                    aria-label={`Decrease ${item.name} quantity`}
                    className="flex h-7 w-7 items-center justify-center rounded-full font-bold text-slate-700 transition-all hover:bg-[#00230c] hover:text-[#FFC700] active:scale-95 sm:h-8 sm:w-8"
                  >
                    <span className="material-symbols-outlined text-[14px] sm:text-[16px]">
                      remove
                    </span>
                  </button>
                  <span className="w-7 text-center text-xs font-black text-slate-900 sm:w-9 sm:text-sm">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onInc(item.id)}
                    aria-label={`Increase ${item.name} quantity`}
                    className="flex h-7 w-7 items-center justify-center rounded-full font-bold text-slate-700 transition-all hover:bg-[#00230c] hover:text-[#FFC700] active:scale-95 sm:h-8 sm:w-8"
                  >
                    <span className="material-symbols-outlined text-[14px] sm:text-[16px]">
                      add
                    </span>
                  </button>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Total
                  </p>
                  <p className="text-base font-black text-[#00230c] sm:text-xl">
                    {formatRupees(item.price * item.quantity)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label={`Remove ${item.name}`}
                  className="shrink-0 rounded-full p-1.5 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 sm:p-2"
                >
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                    delete
                  </span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-extrabold text-[#00230c] hover:underline"
        >
          <span aria-hidden>←</span> Continue Shopping
        </Link>
      </div>
    </div>
  );
}
