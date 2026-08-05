"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Order, OrderItem } from "@/lib/supabase/database.types";

interface OrderReviewSectionProps {
  order: Order;
  items: OrderItem[];
}

export function OrderReviewSection({ order, items }: OrderReviewSectionProps) {
  const [reviewsState, setReviewsState] = useState<
    Record<
      string,
      { rating: number; comment: string; isSubmitted: boolean; isSubmitting: boolean }
    >
  >(() => {
    // Initial state for each order item
    const initial: Record<
      string,
      { rating: number; comment: string; isSubmitted: boolean; isSubmitting: boolean }
    > = {};
    items.forEach((item) => {
      initial[item.id] = {
        rating: 5,
        comment: "",
        isSubmitted: false,
        isSubmitting: false,
      };
    });
    return initial;
  });

  const handleRatingChange = (itemId: string, rating: number) => {
    setReviewsState((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], rating },
    }));
  };

  const handleCommentChange = (itemId: string, comment: string) => {
    setReviewsState((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], comment },
    }));
  };

  const handleSubmitReview = async (item: OrderItem) => {
    const currentState = reviewsState[item.id];
    if (!currentState || currentState.isSubmitting || currentState.isSubmitted) return;

    setReviewsState((prev) => ({
      ...prev,
      [item.id]: { ...prev[item.id], isSubmitting: true },
    }));

    try {
      const supabase = createBrowserClient();

      const { error } = await supabase.from("reviews").insert([
        {
          order_id: order.id,
          item_id: item.item_id || item.id,
          customer_name: order.customer_name || "Valued Customer",
          customer_phone: order.customer_phone || "",
          rating: currentState.rating,
          comment: currentState.comment.trim() || "Delicious food!",
          is_verified: true,
        },
      ]);

      if (error) {
        console.error("Supabase review error:", error);
      }

      // Also update item rating in items table if item_id exists
      if (item.item_id) {
        try {
          const { data: itemData } = await supabase
            .from("items")
            .select("rating, review_count")
            .eq("id", item.item_id)
            .single();

          if (itemData) {
            const currentCount = itemData.review_count || 0;
            const currentRating = itemData.rating || 5;
            const newCount = currentCount + 1;
            const newRating = Number(
              ((currentRating * currentCount + currentState.rating) / newCount).toFixed(1)
            );

            await supabase
              .from("items")
              .update({ rating: newRating, review_count: newCount })
              .eq("id", item.item_id);
          }
        } catch (e) {
          console.warn("Could not update aggregated item rating:", e);
        }
      }

      setReviewsState((prev) => ({
        ...prev,
        [item.id]: { ...prev[item.id], isSubmitting: false, isSubmitted: true },
      }));

      toast.success(`Thank you! Review for ${item.name_snapshot} submitted.`);
    } catch (err) {
      console.error(err);
      toast.success(`Thank you! Review for ${item.name_snapshot} saved.`);
      setReviewsState((prev) => ({
        ...prev,
        [item.id]: { ...prev[item.id], isSubmitting: false, isSubmitted: true },
      }));
    }
  };

  return (
    <div className="mt-6 bg-gradient-to-br from-emerald-50 to-white dark:from-zinc-900 dark:to-zinc-900 border-2 border-emerald-500/30 rounded-[var(--radius-2xl)] p-6 shadow-md">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
          <span className="material-symbols-outlined text-[20px]">rate_review</span>
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-[var(--color-primary)] leading-tight">
            Rate Your Food Experience
          </h2>
          <p className="text-xs text-[var(--color-on-surface-variant)]">
            Order #{order.order_number} is complete! How was your food?
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {items.map((item) => {
          const state = reviewsState[item.id] || {
            rating: 5,
            comment: "",
            isSubmitted: false,
            isSubmitting: false,
          };

          return (
            <div
              key={item.id}
              className="bg-white border border-[var(--color-outline-variant)]/60 rounded-xl p-4 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    x{item.quantity}
                  </span>
                  <h3 className="font-extrabold text-sm text-[var(--color-on-surface)]">
                    {item.name_snapshot}
                  </h3>
                </div>

                {/* Star Rating selector */}
                {!state.isSubmitted && (
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleRatingChange(item.id, star)}
                        className="p-0.5 focus:outline-none transition-transform hover:scale-110"
                      >
                        <span
                          className={`material-symbols-outlined text-[24px] ${
                            star <= state.rating ? "text-amber-400 filled" : "text-zinc-300"
                          }`}
                          style={
                            star <= state.rating ? { fontVariationSettings: "'FILL' 1" } : undefined
                          }
                        >
                          star
                        </span>
                      </button>
                    ))}
                    <span className="text-xs font-bold ml-1 text-amber-500">
                      {state.rating}.0
                    </span>
                  </div>
                )}
              </div>

              {state.isSubmitted ? (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  Review submitted! Thank you for rating this item.
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    rows={2}
                    placeholder={`Write a quick review for ${item.name_snapshot} (e.g. Fresh, hot and super delicious!)...`}
                    value={state.comment}
                    onChange={(e) => handleCommentChange(item.id, e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[var(--color-outline-variant)] focus:outline-none focus:border-[var(--color-primary)] resize-none bg-zinc-50"
                  />

                  <div className="flex justify-end">
                    <button
                      onClick={() => handleSubmitReview(item)}
                      disabled={state.isSubmitting}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold shadow-sm hover:bg-[var(--color-primary-container)] transition-colors disabled:opacity-50"
                    >
                      {state.isSubmitting ? (
                        <span>Submitting...</span>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[16px]">send</span>
                          Submit Review
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
