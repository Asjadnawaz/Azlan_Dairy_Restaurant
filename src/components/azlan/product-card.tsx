"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-store";
import { toast } from "sonner";
import type { Item } from "@/lib/supabase/database.types";

export function ProductCard({ item, isStoreActive }: { item: Item; isStoreActive: boolean }) {
  const add = useCart((s) => s.add);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    if (!isStoreActive) {
      toast.error("Store Closed. Please Try Again Later.");
      return;
    }
    add(
      {
        id: item.id,
        name: item.name,
        price: item.price,
        image_path: item.image_path,
      },
      1
    );
    setAdded(true);
    toast.success(`${item.name} added to cart`);
    setTimeout(() => setAdded(false), 1400);
  }

  const isPopular = item.name === "Zinger Burger" || item.name === "Jumbo Zinger Burger";
  const isSpicy = item.tags?.includes("spicy") || item.tags?.includes("fried");
  const isVeg = item.badges?.includes("Veg");
  const hasReviews = item.review_count > 0;

  return (
    <article
      className="group lift-on-hover rounded-[var(--radius-2xl)] bg-[var(--color-surface-container-lowest)]
        border border-[var(--color-surface-variant)] overflow-hidden flex flex-col
        shadow-[0_4px_20px_rgba(0,35,12,0.08)] hover:border-[var(--color-primary)]/30
        hover:shadow-[0_16px_44px_rgba(0,35,12,0.16)]"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={item.image_path || "/images/burger.jpg"}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Badges */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10">
          {isPopular && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-lg shadow-orange-500/40 ring-2 ring-yellow-200/90 backdrop-blur-md transition-all duration-300 group-hover:scale-105">
              <span
                className="material-symbols-outlined text-[14px] text-amber-950 font-black animate-pulse"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                local_fire_department
              </span>
              POPULAR
            </span>
          )}
          {isVeg && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-green-600 border-2 border-white shadow-sm">
              <span className="w-2 h-2 rounded-full bg-white" />
            </span>
          )}
        </div>

        {/* Price pill */}
        <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full bg-[var(--color-primary)] text-white text-sm font-bold">
          Rs. {item.price}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-sm leading-tight">{item.name}</h3>
          {isSpicy && (
            <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--color-error)]/10 text-[var(--color-error)] text-[10px] font-bold">
              <span className="material-symbols-outlined" style={{ fontSize: 11 }}>local_fire_department</span>
              Spicy
            </span>
          )}
        </div>

        <p className="mt-1 text-xs text-[var(--color-on-surface-variant)] line-clamp-2 flex-1">
          {item.description}
        </p>

        {/* Meta info (Read-only rating or prep status) */}
        <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--color-on-surface-variant)]">
          {hasReviews ? (
            <div className="inline-flex items-center gap-1 font-bold text-amber-600">
              <span
                className="material-symbols-outlined text-amber-500"
                style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
              <span>{Number(item.rating).toFixed(1)} ({item.review_count})</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 text-[var(--color-on-surface-variant)]">
              <span className="material-symbols-outlined text-[13px]">restaurant_menu</span>
              <span>Freshly Made</span>
            </div>
          )}
          <span className="inline-flex items-center gap-0.5 text-[var(--color-on-surface-variant)]">
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>schedule</span>
            {item.prep_time_min ?? 15} min
          </span>
        </div>

        {/* Action */}
        <div className="cart-btn-wrapper">
          <button
            onClick={handleAdd}
            disabled={!isStoreActive}
            className={`cart-btn-animated ${added ? "added-state" : ""} ${
              !isStoreActive ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {added ? (
              <>
                <span className="material-symbols-outlined text-[18px]">check</span>
                Added
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                {isStoreActive ? "Add to Cart" : "Store Closed"}
              </>
            )}
          </button>
          <div className="cart-btn-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 268.832 268.832">
              <path d="M265.17 125.577l-80-80c-4.88-4.88-12.796-4.88-17.677 0-4.882 4.882-4.882 12.796 0 17.678l58.66 58.66H12.5c-6.903 0-12.5 5.598-12.5 12.5 0 6.903 5.597 12.5 12.5 12.5h213.654l-58.66 58.662c-4.88 4.882-4.88 12.796 0 17.678 2.44 2.44 5.64 3.66 8.84 3.66s6.398-1.22 8.84-3.66l79.997-80c4.883-4.882 4.883-12.796 0-17.678z" />
            </svg>
          </div>
        </div>
      </div>
    </article>
  );
}
