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
      toast.error("Store is currently closed. Please try again later.");
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

  const isPopular = item.badges?.includes("Popular") || item.badges?.includes("Hot Seller");
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
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isPopular && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-[var(--color-success)] text-[10px] font-bold text-white">
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>local_fire_department</span>
              Popular
            </span>
          )}
          {isVeg && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-green-600 border-2 border-white">
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

        {/* Meta */}
        <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--color-on-surface-variant)]">
          <span className="inline-flex items-center gap-0.5 font-semibold">
            <span
              className="material-symbols-outlined text-amber-500"
              style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
            {hasReviews ? `${Number(item.rating).toFixed(1)} (${item.review_count})` : "New"}
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-0.5">
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>schedule</span>
            {item.prep_time_min ?? 15} min
          </span>
        </div>

        {/* Action */}
        <button
          onClick={handleAdd}
          disabled={!isStoreActive}
          className={`mt-3 w-full py-2.5 rounded-full font-bold text-sm transition-all flex items-center justify-center gap-1.5 custom-shadow
            ${added
              ? "bg-[var(--color-success)] text-white"
              : isStoreActive
              ? "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-container)]"
              : "bg-[var(--color-on-surface-variant)]/30 text-[var(--color-on-surface-variant)] cursor-not-allowed"}`}
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
      </div>
    </article>
  );
}
