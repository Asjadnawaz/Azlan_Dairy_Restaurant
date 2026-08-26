"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useCart } from "@/lib/cart-store";
import { useMounted } from "@/hooks/use-mounted";
import { toast } from "sonner";
import type { Item } from "@/lib/supabase/database.types";

/** Shape returned by GET /api/reviews — names already shortened, phone dropped. */
type PublicItemReview = {
  id: string;
  name: string;
  rating: number;
  comment: string | null;
  created_at: string;
  is_verified: boolean;
};

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
  const [reviews, setReviews] = useState<PublicItemReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [imgError, setImgError] = useState(false);
  const add = useCart((s) => s.add);
  const mounted = useMounted();

  // Reset the per-item UI state during render when the item changes, not in an
  // effect: React 19 flags a synchronous setState in an effect body as a
  // cascading render (error). Tracking the previous id and resetting inline is
  // React's documented "adjust state when a prop changes" pattern.
  const [prevItemId, setPrevItemId] = useState<string | null>(item?.id ?? null);
  if ((item?.id ?? null) !== prevItemId) {
    setPrevItemId(item?.id ?? null);
    setQty(1);
    setImgError(false);
    setReviews([]);
    setLoadingReviews(item != null);
  }

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

  // Fetch reviews whenever the item changes. The visible-loading flag is set by
  // the render-time reset above; here we only kick off the request and clear the
  // flag after it resolves (both async, so not flagged as a cascading render).
  useEffect(() => {
    if (!item) return;
    const itemId = item.id;
    const controller = new AbortController();

    async function fetchReviews() {
      try {
        // Through the API rather than a browser `select`: the route shortens
        // customer names ("Ahmed K."), which is the same treatment the homepage
        // gives them. The raw table holds the full name and the phone.
        const res = await fetch(`/api/reviews?item_id=${encodeURIComponent(itemId)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Reviews request failed: ${res.status}`);
        const payload = (await res.json()) as { reviews?: PublicItemReview[] };
        setReviews(payload.reviews ?? []);
      } catch (err) {
        // An aborted request is the effect cleaning up, not a failure.
        if ((err as Error).name !== "AbortError") {
          setReviews([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoadingReviews(false);
      }
    }

    void fetchReviews();
    return () => controller.abort();
  }, [item]);

  if (!item || !mounted) return null;

  // The DB trigger keeps `rating`/`review_count` honest, so an unrated item has
  // review_count 0 (and often rating 0). Never fake a 5.0 for it.
  const reviewCount = item.review_count || 0;
  const ratingValue = Number(item.rating) || 0;
  const hasRating = reviewCount > 0 && ratingValue > 0;

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
                  {hasRating ? (
                    <span className="inline-flex items-center gap-1 font-extrabold text-amber-400 text-xs sm:text-sm bg-black/40 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                      <span
                        className="material-symbols-outlined text-[15px] filled text-amber-400"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                      {ratingValue.toFixed(1)} ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-200 font-semibold bg-black/40 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                      <span className="material-symbols-outlined text-[14px]">star</span>
                      No reviews yet
                    </span>
                  )}

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
                    const stars = Math.min(5, Math.max(0, Math.round(rev.rating || 0)));
                    return (
                      <div
                        key={rev.id}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1.5"
                      >
                        <div className="flex justify-between items-center font-bold text-slate-800">
                          <span className="flex items-center gap-1.5">
                            {rev.name}
                            {rev.is_verified && (
                              <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-100 px-1.5 py-0.2 rounded">
                                Verified
                              </span>
                            )}
                          </span>

                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span
                                key={i}
                                className={`material-symbols-outlined text-[13px] ${
                                  i < stars ? "text-amber-400" : "text-slate-300"
                                }`}
                                style={{ fontVariationSettings: i < stars ? "'FILL' 1" : "'FILL' 0" }}
                              >
                                star
                              </span>
                            ))}
                          </div>
                        </div>
                        {rev.comment && (
                          <p className="text-slate-600 font-medium leading-relaxed">{rev.comment}</p>
                        )}
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
