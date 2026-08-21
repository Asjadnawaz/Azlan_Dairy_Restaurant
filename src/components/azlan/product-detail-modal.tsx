"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { createBrowserClient } from "@/lib/supabase/client";
import { useCart } from "@/lib/cart-store";
import { toast } from "sonner";
import type { Item, Review } from "@/lib/supabase/database.types";

interface ProductDetailModalProps {
  item: Item | null;
  onClose: () => void;
  isStoreActive?: boolean;
}

export function ProductDetailModal({
  item,
  onClose,
  isStoreActive = true,
}: ProductDetailModalProps) {
  const [qty, setQty] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const add = useCart((s) => s.add);

  // Mount check for React Portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll and handle Escape key press
  useEffect(() => {
    if (!item) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [item, onClose]);

  // Reset state and fetch reviews whenever item changes
  useEffect(() => {
    if (!item) return;
    setQty(1);
    setImgError(false);
    setLoadingReviews(true);
    const itemId = item.id;

    async function fetchReviews() {
      try {
        const supabase = createBrowserClient();
        const { data } = await supabase
          .from("reviews")
          .select("*")
          .eq("item_id", itemId)
          .order("created_at", { ascending: false });

        if (data) setReviews(data as Review[]);
      } catch {
        // silent fallback
      } finally {
        setLoadingReviews(false);
      }
    }

    void fetchReviews();
  }, [item]);

  if (!item || !mounted) return null;

  const handleAddToCart = () => {
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
      qty
    );

    toast.success(`${qty}× ${item.name} added to cart!`);
    onClose();
  };

  const formattedImageSrc =
    !imgError && item.image_path
      ? item.image_path
          .replace("/images/Orignal_Images/", "/images/Webp_Orignal_images/")
          .replace(/\.(jpeg|jpg|png)$/i, ".webp")
      : "/images/burger.jpg";

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-detail-title"
    >
      <div
        className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl animate-scale-in max-h-[92vh] flex flex-col border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all backdrop-blur-md shadow-md active:scale-90"
          aria-label="Close product view"
        >
          <span className="material-symbols-outlined text-[22px]">close</span>
        </button>

        <div className="overflow-y-auto slim-scrollbar flex-1">
          {/* Hero Product Image */}
          <div className="relative w-full h-60 sm:h-72 bg-slate-950 shrink-0">
            <Image
              src={formattedImageSrc}
              alt={item.name}
              fill
              priority
              sizes="(max-width: 640px) 100vw, 672px"
              onError={() => setImgError(true)}
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Badges Overlay */}
            <div className="absolute top-3 left-4 flex gap-2 z-10">
              {item.badges?.map((badge, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-full bg-emerald-600/90 text-white font-extrabold text-[10px] uppercase tracking-wider shadow-sm backdrop-blur-xs"
                >
                  {badge}
                </span>
              ))}
            </div>

            {/* Hero Text */}
            <div className="absolute bottom-4 left-5 right-5 flex justify-between items-end text-white">
              <div>
                <h2 id="product-detail-title" className="text-xl sm:text-3xl font-black leading-tight drop-shadow-md">
                  {item.name}
                </h2>
                <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 font-extrabold text-amber-400 text-xs sm:text-sm bg-black/40 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                    <span
                      className="material-symbols-outlined text-[15px] filled text-amber-400"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    {Number(item.rating || 5).toFixed(1)} ({item.review_count || 0} reviews)
                  </span>

                  <span className="inline-flex items-center gap-1 text-xs text-slate-200 font-semibold bg-black/40 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    Prep: {item.prep_time_min || 15} mins
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xl sm:text-3xl font-black text-[#FFC700] drop-shadow-md">
                  Rs. {item.price}
                </span>
              </div>
            </div>
          </div>

          {/* Details Body */}
          <div className="p-5 sm:p-6 space-y-5">
            {/* Tags / Badges if present */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-extrabold uppercase tracking-wide border border-slate-200"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                Product Details & Ingredients
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed font-medium">
                {item.description || "Freshly made with authentic high quality ingredients and served hot."}
              </p>
            </div>

            {/* Quantity Selector & Add to Cart */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-3">
                <span className="text-xs font-extrabold uppercase text-slate-600">Quantity:</span>
                <div className="flex items-center border border-slate-300 rounded-xl bg-white shadow-xs">
                  <button
                    type="button"
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    disabled={!isStoreActive || qty <= 1}
                    className="w-9 h-9 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 rounded-l-xl transition-colors"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-black text-sm text-slate-900">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty(qty + 1)}
                    disabled={!isStoreActive}
                    className="w-9 h-9 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 rounded-r-xl transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!isStoreActive}
                className="btn-shine w-full sm:w-auto px-6 py-3 rounded-xl bg-[var(--color-primary)] hover:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                {isStoreActive ? `Add to Cart • Rs. ${item.price * qty}` : "Store Closed"}
              </button>
            </div>

            {/* Customer Reviews List */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500 text-[18px]">rate_review</span>
                  Customer Reviews ({reviews.length})
                </h3>
              </div>

              {loadingReviews ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                  <span className="material-symbols-outlined text-[16px] animate-spin text-emerald-600">
                    progress_activity
                  </span>
                  Loading customer feedback...
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto slim-scrollbar pr-1">
                  {reviews.map((rev) => {
                    const stars = Math.min(5, Math.max(1, Math.round(rev.rating || 5)));
                    return (
                      <div
                        key={rev.id}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1.5"
                      >
                        <div className="flex justify-between items-center font-bold text-slate-800">
                          <span className="flex items-center gap-1.5">
                            {rev.customer_name}
                            {rev.is_verified && (
                              <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-100 px-1.5 py-0.2 rounded">
                                Verified
                              </span>
                            )}
                          </span>

                          <div className="flex text-amber-400">
                            {Array.from({ length: stars }).map((_, i) => (
                              <span
                                key={i}
                                className="material-symbols-outlined text-[13px] filled text-amber-400"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                star
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="text-slate-600 font-medium leading-relaxed">{rev.comment}</p>
                        {rev.created_at && (
                          <p className="text-[10px] text-slate-400 font-medium">
                            {new Date(rev.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 font-medium italic">
                    No customer reviews yet. Be the first to try and review this item!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
