"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MenuImage } from "@/components/menu/menu-image";
import { useMounted } from "@/hooks/use-mounted";
import { toast } from "sonner";

/**
 * Professional Post-Delivery Review Modal
 *
 * Designed with luxury aesthetics matching the Azlan Dairy brand:
 * - Tactile 5-star rating with dynamic mood badges & emoji reactions
 * - 1-tap quick feedback chips based on chosen rating
 * - Step progress indicator for multi-item orders
 * - Rich product preview card with verified order badge
 * - Accessible keyboard navigation & mobile bottom sheet UX
 * - Smooth submission states & completion celebration screen
 */

export type ReviewableItem = {
  /** `items.id` — the FK target. Never `order_items.id`. */
  itemId: string;
  name: string;
  imagePath?: string | null;
};

export type ReviewTarget = {
  orderId: string;
  orderNumber: string;
  items: ReviewableItem[];
};

type RatingMeta = {
  label: string;
  emoji: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  tags: string[];
};

const RATING_DATA: Record<number, RatingMeta> = {
  1: {
    label: "Poor",
    emoji: "😞",
    description: "Not what was expected",
    badgeBg: "bg-rose-50 dark:bg-rose-950/40",
    badgeText: "text-rose-700 dark:text-rose-300",
    badgeBorder: "border-rose-200 dark:border-rose-800",
    tags: ["⏳ Late Delivery", "❄️ Arrived Cold", "📦 Packaging Leak", "🧂 Taste Issue", "📏 Small Portion"],
  },
  2: {
    label: "Not Great",
    emoji: "😕",
    description: "Could be improved",
    badgeBg: "bg-amber-50 dark:bg-amber-950/40",
    badgeText: "text-amber-800 dark:text-amber-300",
    badgeBorder: "border-amber-200 dark:border-amber-800",
    tags: ["⏳ Late Delivery", "❄️ Arrived Cold", "📦 Packaging Leak", "🧂 Taste Issue", "📏 Small Portion"],
  },
  3: {
    label: "Satisfactory",
    emoji: "🙂",
    description: "Good & acceptable",
    badgeBg: "bg-slate-100 dark:bg-slate-800",
    badgeText: "text-slate-800 dark:text-slate-200",
    badgeBorder: "border-slate-200 dark:border-slate-700",
    tags: ["👌 Decent Taste", "📦 Okay Packaging", "⏳ Average Delivery", "✨ Fair Value"],
  },
  4: {
    label: "Delicious",
    emoji: "😋",
    description: "Great taste & quality",
    badgeBg: "bg-emerald-50 dark:bg-emerald-950/40",
    badgeText: "text-emerald-800 dark:text-emerald-300",
    badgeBorder: "border-emerald-200 dark:border-emerald-800",
    tags: ["🔥 Fresh & Hot", "🤤 Super Delicious", "⚡ Fast Delivery", "🥛 Rich Quality", "📦 Great Packaging", "👌 Perfect Portion"],
  },
  5: {
    label: "Exceptional!",
    emoji: "🌟",
    description: "Loved every bite!",
    badgeBg: "bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/30",
    badgeText: "text-amber-900 dark:text-amber-200 font-extrabold",
    badgeBorder: "border-amber-300 dark:border-amber-700",
    tags: ["🔥 Super Fresh & Hot", "🤤 Outstanding Taste", "⚡ Lightning Fast", "🥛 Pure Farm Fresh", "📦 Premium Packaging", "💯 10/10 Highly Recommend"],
  },
};

function StarRatingInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (next: number) => void;
  disabled: boolean;
}) {
  const [hovered, setHovered] = useState(0);
  const activeRating = hovered || value;
  const meta = activeRating > 0 ? RATING_DATA[activeRating] : null;

  return (
    <div className="flex flex-col items-center">
      {/* Stars Row */}
      <div
        role="radiogroup"
        aria-label="Rating out of 5 stars"
        className="flex items-center justify-center gap-1.5 sm:gap-2.5 py-1"
        onMouseLeave={() => setHovered(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= activeRating;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} star${star === 1 ? "" : "s"}`}
              disabled={disabled}
              onMouseEnter={() => setHovered(star)}
              onFocus={() => setHovered(star)}
              onBlur={() => setHovered(0)}
              onClick={() => onChange(star)}
              className="group relative rounded-full p-1 sm:p-1.5 transition-all duration-150 hover:scale-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] active:scale-95 disabled:opacity-50"
            >
              <span
                className={`material-symbols-outlined select-none text-[38px] sm:text-[44px] leading-none transition-all duration-200 ${
                  isFilled
                    ? "filled text-[#FFC700] drop-shadow-[0_2px_8px_rgba(255,199,0,0.55)] scale-105"
                    : "text-slate-300 dark:text-slate-600 hover:text-amber-300"
                }`}
              >
                star
              </span>
            </button>
          );
        })}
      </div>

      {/* Mood Feedback Pill */}
      <div className="min-h-[34px] mt-1.5 flex items-center justify-center">
        {meta ? (
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs sm:text-sm font-bold border shadow-xs transition-all duration-200 ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}
          >
            <span>{meta.emoji}</span>
            <span>{meta.label}</span>
            <span className="opacity-40">·</span>
            <span className="font-normal opacity-85 text-[11px] sm:text-xs">
              {meta.description}
            </span>
          </div>
        ) : (
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Tap a star to rate this item
          </p>
        )}
      </div>
    </div>
  );
}

export function ReviewPromptModal({
  target,
  onClose,
  onCompleted,
}: {
  target: ReviewTarget;
  /** "Not now" — the whole order is postponed, nothing is recorded. */
  onClose: () => void;
  /** Every item has been rated or skipped. Receives the reviewed item ids. */
  onCompleted: (reviewedItemIds: string[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [done, setDone] = useState<string[]>([]);
  const mounted = useMounted();

  const item = target.items[index];
  const totalItems = target.items.length;
  const isLast = index >= totalItems - 1;

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const finish = useCallback(
    (reviewed: string[]) => {
      if (reviewed.length > 0) {
        setShowThankYou(true);
        setTimeout(() => {
          toast.success("Thank you for your review!", {
            description: "Your genuine feedback helps us and our customers.",
          });
          onCompleted(reviewed);
        }, 1200);
      } else {
        onCompleted(reviewed);
      }
    },
    [onCompleted]
  );

  const advance = useCallback(
    (reviewed: string[]) => {
      if (isLast) {
        finish(reviewed);
        return;
      }
      setDone(reviewed);
      setIndex((i) => i + 1);
      setRating(0);
      setComment("");
      setSelectedTags([]);
      setImgError(false);
    },
    [finish, isLast]
  );

  // Escape key closes modal safely
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting && !showThankYou) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, submitting, showThankYou]);

  if (!mounted || !item) return null;

  const submit = async () => {
    if (rating < 1) {
      toast.error("Please choose a star rating first");
      return;
    }
    setSubmitting(true);

    // Combine any 1-tap quick tags with handwritten comments cleanly
    const fullComment = [
      selectedTags.length > 0 ? selectedTags.join(", ") : null,
      comment.trim() || null,
    ]
      .filter(Boolean)
      .join(" — ")
      .slice(0, 500);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: target.orderId,
          item_id: item.itemId,
          rating,
          comment: fullComment || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      // 409 means it is already reviewed — that is a success from customer perspective
      if (!res.ok && res.status !== 409) {
        toast.error(data.error || "Could not save your review");
        setSubmitting(false);
        return;
      }
      advance([...done, item.itemId]);
    } catch {
      toast.error("Network issue — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  const currentMeta = rating > 0 ? RATING_DATA[rating] : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-prompt-title"
      onClick={() => {
        if (!submitting && !showThankYou) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-t-[32px] sm:rounded-[28px] shadow-[0_25px_60px_-15px_rgba(0,35,12,0.35)] border border-slate-100 dark:border-zinc-800 overflow-hidden animate-scale-in flex flex-col max-h-[92vh]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Brand Luxury Gradient Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[var(--color-primary)] via-emerald-500 to-[#FFC700]" />

        {showThankYou ? (
          /* ============================================================ */
          /* Celebration / Thank You State                                */
          /* ============================================================ */
          <div className="p-8 sm:p-10 flex flex-col items-center justify-center text-center animate-fade-in my-auto">
            <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-amber-50 dark:from-emerald-950/50 dark:to-zinc-800 border-2 border-emerald-500/30 shadow-lg animate-soft-pulse">
              <span className="material-symbols-outlined text-[44px] text-emerald-600 dark:text-emerald-400 filled">
                verified
              </span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Thank You for Your Review!
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-sm">
              Your genuine rating helps our kitchen keep delivering perfection and helps other food lovers choose with confidence.
            </p>
          </div>
        ) : (
          /* ============================================================ */
          /* Main Review Form Body                                        */
          /* ============================================================ */
          <>
            {/* Mobile Sheet Grabber */}
            <div className="sm:hidden flex justify-center pt-2 pb-0">
              <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-zinc-700" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-3 sm:pt-4 pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    <span className="material-symbols-outlined text-[12px] filled">
                      verified_user
                    </span>
                    Verified Order
                  </span>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                    #{target.orderNumber}
                  </span>
                </div>
                <h2
                  id="review-prompt-title"
                  className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white"
                >
                  How was your experience?
                </h2>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                aria-label="Close review dialog"
                className="shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all flex items-center justify-center active:scale-90 disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Multi-Item Segmented Stepper Bar */}
            {totalItems > 1 && (
              <div className="px-5 sm:px-6 py-2.5 bg-slate-50 dark:bg-zinc-800/40 border-b border-slate-100 dark:border-zinc-800 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1.5 text-slate-900 dark:text-white">
                    <span className="material-symbols-outlined text-[15px] text-[var(--color-primary)] dark:text-emerald-400">
                      format_list_bulleted
                    </span>
                    Item {index + 1} of {totalItems}
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    {totalItems - index - 1 > 0
                      ? `${totalItems - index - 1} remaining`
                      : "Final item"}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-zinc-700 overflow-hidden flex gap-1">
                  {target.items.map((_, i) => (
                    <div
                      key={i}
                      className={`h-full flex-1 rounded-full transition-all duration-300 ${
                        i < index
                          ? "bg-emerald-500"
                          : i === index
                          ? "bg-[var(--color-primary)] dark:bg-emerald-400"
                          : "bg-transparent"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Scrollable Content Container */}
            <div className="overflow-y-auto slim-scrollbar px-5 sm:px-6 py-4 space-y-4">
              {/* Product Highlight Card */}
              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-gradient-to-br from-emerald-50/60 via-white to-amber-50/30 dark:from-zinc-800/80 dark:via-zinc-800/50 dark:to-zinc-800/30 border border-emerald-900/10 dark:border-emerald-500/15 shadow-xs">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 shadow-xs">
                  {item.imagePath && !imgError ? (
                    <MenuImage
                      src={item.imagePath}
                      alt={item.name}
                      fill
                      sizes="64px"
                      className="object-cover transition-transform duration-300 hover:scale-105"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[var(--color-primary)]/5 dark:bg-emerald-950/40 text-[var(--color-primary)] dark:text-emerald-400">
                      <span className="material-symbols-outlined text-[26px]">
                        restaurant
                      </span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Delivered Item
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                    {item.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Share your honest rating with Azlan Dairy
                  </p>
                </div>
              </div>

              {/* Star Rating Control */}
              <div className="pt-1 pb-1">
                <StarRatingInput
                  value={rating}
                  onChange={setRating}
                  disabled={submitting}
                />
              </div>

              {/* 1-Tap Quick Feedback Chips */}
              {currentMeta && currentMeta.tags.length > 0 && (
                <div className="animate-fade-in pt-1">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 flex items-center justify-between">
                    <span>
                      {rating >= 4
                        ? "What made it great?"
                        : "What could be improved?"}
                    </span>
                    <span className="text-[10px] font-normal text-slate-400">
                      Optional · tap to toggle
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {currentMeta.tags.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          disabled={submitting}
                          onClick={() => handleToggleTag(tag)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 border active:scale-95 ${
                            isSelected
                              ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-xs scale-102"
                              : "bg-slate-100/90 dark:bg-zinc-800/90 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-zinc-700"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Comment Textarea Input */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="review-comment-field"
                    className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[15px] text-slate-400">
                      edit_note
                    </span>
                    Additional feedback{" "}
                    <span className="font-medium text-slate-400">(optional)</span>
                  </label>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {comment.length} / 500
                  </span>
                </div>
                <textarea
                  id="review-comment-field"
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 500))}
                  disabled={submitting}
                  rows={2}
                  placeholder={
                    rating >= 4
                      ? "Tell us what you loved about the food, taste, or service..."
                      : "Help us know what we can do better next time..."
                  }
                  className="w-full resize-none rounded-2xl border border-slate-200 dark:border-zinc-700 bg-slate-50/70 dark:bg-zinc-800/60 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[var(--color-primary)] focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-[var(--color-primary)]/10 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 sm:px-6 bg-slate-50/80 dark:bg-zinc-900/90 border-t border-slate-100 dark:border-zinc-800 flex flex-col gap-2.5">
              {/* Primary Submit Button */}
              <button
                type="button"
                onClick={submit}
                disabled={submitting || rating < 1}
                className="btn-shine relative inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--color-primary)] via-emerald-900 to-[var(--color-primary)] px-6 py-3.5 text-sm font-black text-white shadow-md hover:shadow-lg transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>Submitting review...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">
                      {isLast ? "rate_review" : "arrow_forward"}
                    </span>
                    <span>
                      {isLast
                        ? "Submit Review"
                        : `Submit & Review Next (${index + 1}/${totalItems})`}
                    </span>
                  </>
                )}
              </button>

              {/* Secondary Navigation (Skip / Not Now) */}
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="rounded-full px-3 py-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors disabled:opacity-50"
                >
                  Maybe later
                </button>

                {totalItems > 1 && (
                  <button
                    type="button"
                    onClick={() => advance(done)}
                    disabled={submitting}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors disabled:opacity-50"
                  >
                    <span>{isLast ? "Skip this item" : "Skip to next"}</span>
                    <span className="material-symbols-outlined text-[14px]">
                      chevron_right
                    </span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
