"use client";

import { useState } from "react";
import Image from "next/image";
import { useCart } from "@/lib/cart-store";
import { toast } from "sonner";
import type { Item } from "@/lib/supabase/database.types";
import { ProductDetailModal } from "./product-detail-modal";

export function ProductCard({ item, isStoreActive }: { item: Item; isStoreActive: boolean }) {
  const add = useCart((s) => s.add);
  const [added, setAdded] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

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
      <div
        className="relative aspect-[4/3] overflow-hidden cursor-pointer"
        onClick={() => setShowDetail(true)}
      >
        <Image
          src={
            item.image_path
              ? item.image_path
                  .replace("/images/Orignal_Images/", "/images/Webp_Orignal_images/")
                  .replace(/\.(jpeg|jpg|png)$/i, ".webp")
              : "/images/burger.jpg"
          }
          alt={item.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="px-3 py-1.5 rounded-full bg-black/60 text-white font-extrabold text-xs backdrop-blur-xs flex items-center gap-1 shadow-md">
            <span className="material-symbols-outlined text-[16px]">visibility</span>
            View Details
          </span>
        </div>

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
          <h3
            className="font-bold text-sm leading-tight cursor-pointer hover:text-emerald-700 transition-colors"
            onClick={() => setShowDetail(true)}
          >
            {item.name}
          </h3>
          {isSpicy && (
            <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--color-error)]/10 text-[var(--color-error)] text-[10px] font-bold">
              <span className="material-symbols-outlined" style={{ fontSize: 11 }}>local_fire_department</span>
              Spicy
            </span>
          )}
        </div>

        <p
          className="mt-1 text-xs text-[var(--color-on-surface-variant)] line-clamp-2 flex-1 cursor-pointer"
          onClick={() => setShowDetail(true)}
        >
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

        {/* Action Buttons */}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDetail(true)}
            className="h-[42px] px-3 sm:px-3.5 rounded-full border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-xs active:scale-95"
            title="View Details"
          >
            <span className="material-symbols-outlined text-[16px]">visibility</span>
            <span className="hidden sm:inline">Details</span>
          </button>

          <button
            type="button"
            onClick={handleAdd}
            disabled={!isStoreActive}
            className={`h-[42px] flex-1 px-4 rounded-full font-extrabold text-xs uppercase tracking-wider transition-all hover:cursor-pointer duration-200 flex items-center justify-center gap-1.5 shadow-sm active:scale-95 btn-shine ${
              added
                ? "bg-emerald-600 text-white shadow-emerald-900/20"
                : !isStoreActive
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-[var(--color-primary)] hover:bg-emerald-800 text-white shadow-emerald-900/20"
            }`}
          >
            {added ? (
              <>
                <span className="material-symbols-outlined text-[18px]">check</span>
                <span>Added</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                <span>{isStoreActive ? "Add to Cart" : "Store Closed"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {showDetail && (
        <ProductDetailModal
          item={item}
          onClose={() => setShowDetail(false)}
          isStoreActive={isStoreActive}
        />
      )}
    </article>
  );
}
