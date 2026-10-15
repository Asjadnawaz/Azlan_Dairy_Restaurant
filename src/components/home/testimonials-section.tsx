import Link from "next/link";
import type { ReviewsSummary } from "@/lib/reviews.server";

/**
 * Customer reviews.
 *
 * This section used to ship three invented five-star reviews — named people who
 * do not exist — as both its initial state and its permanent fallback, under a
 * Google logo, the words "VERIFIED CUSTOMER REVIEWS" and a hardcoded "4.9 / 5.0".
 * Since `reviews` was empty, that is all anyone ever saw. Everything here is now
 * real or absent:
 *
 * - the average and the count are computed from the rows in `reviews`
 * - empty stars render as empty, so a 4-star review does not look like a 5
 * - with no reviews yet it says so and invites the first one
 * - the Google badge is gone: these are reviews left on this site, and putting
 *   Google's logo on them would misattribute them. The Google CTA stays, clearly
 *   separate, for customers who want to review there too.
 *
 * A server component — no client JS, and the data arrives with the page.
 */

/** Set this once you have the shop's Google Business profile link. */
const GOOGLE_PLACE_URL: string | null = null;

function googleReviewUrl(address: string | null): string {
  if (GOOGLE_PLACE_URL) return GOOGLE_PLACE_URL;
  // Best available until the real place URL is in hand: a maps search for the
  // shop, which lands on the listing rather than a blank map.
  const query = encodeURIComponent(address || "Azlan Fast Food, Malir, Karachi");
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function Stars({ rating, size = 18 }: { rating: number; size?: number }) {
  return (
    <div className="flex" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          aria-hidden="true"
          className={`material-symbols-outlined leading-none ${star <= Math.round(rating)
            ? "filled text-amber-400"
            : "text-[var(--color-outline-variant)]"
            }`}
          style={{
            fontSize: `${size}px`,
            fontVariationSettings: star <= Math.round(rating) ? "'FILL' 1" : "'FILL' 0",
          }}
        >
          star
        </span>
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

export function TestimonialsSection({
  reviews,
  address,
}: {
  reviews: ReviewsSummary;
  address: string | null;
}) {
  const { average, count, featured } = reviews;
  const hasReviews = count > 0;

  return (
    <section
      id="reviews"
      className="relative overflow-hidden bg-[var(--color-surface-container-low)] py-14 md:py-20"
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 transform-gpu rounded-full bg-[var(--color-mint-accent)]/15 blur-3xl sm:block" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-8">
        {/* ------------------------------------------------------- header */}
        <div className="mx-auto mb-10 max-w-2xl space-y-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-outline-variant)] bg-white px-4 py-1.5 shadow-sm">
            <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">
              reviews
            </span>
            <span className="text-[11px] font-extrabold tracking-wide text-[var(--color-on-surface)]">
              {hasReviews ? "WHAT OUR CUSTOMERS SAY" : "REVIEWS"}
            </span>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-primary)] sm:text-3xl md:text-4xl">
            {hasReviews ? "Real taste. Real reviews." : "Be the first to review us"}
          </h2>

          {hasReviews ? (
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 pt-1">
              <Stars rating={average} size={22} />
              <span className="text-base font-extrabold text-[var(--color-on-surface)]">
                {average.toFixed(1)} / 5
              </span>
              <span className="text-xs font-medium text-[var(--color-on-surface-variant)]">
                from {count} {count === 1 ? "review" : "reviews"}
              </span>
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-[var(--color-on-surface-variant)]">
              Order something and you will be asked to rate it once it arrives.
              Every review here comes from a delivered order — nothing else.
            </p>
          )}
        </div>

        {/* -------------------------------------------------------- cards */}
        {featured.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {featured.slice(0, 6).map((review) => (
              <figure
                key={review.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Stars rating={review.rating} />
                    {review.isVerified && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                        <span className="material-symbols-outlined text-[13px]">
                          verified
                        </span>
                        Delivered order
                      </span>
                    )}
                  </div>

                  <blockquote className="text-sm font-medium leading-relaxed text-slate-700">
                    &ldquo;{review.comment}&rdquo;
                  </blockquote>
                </div>

                <figcaption className="mt-4 flex items-center gap-2.5 border-t border-slate-100 pt-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">
                    {review.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-extrabold leading-tight text-slate-900">
                      {review.name}
                    </p>
                    <p className="truncate text-[10px] font-medium text-slate-400">
                      {review.itemName ? `${review.itemName} · ` : ""}
                      {formatDate(review.created_at)}
                    </p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-md rounded-2xl border border-dashed border-[var(--color-outline-variant)] bg-white/70 px-6 py-10 text-center">
            <span className="material-symbols-outlined text-[36px] text-[var(--color-outline-variant)]">
              rate_review
            </span>
            <p className="mt-2 text-sm font-bold text-[var(--color-on-surface)]">
              {hasReviews
                ? "No written reviews yet"
                : "No reviews yet"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-on-surface-variant)]">
              {hasReviews
                ? "Customers have rated us, but nobody has left a message yet."
                : "Yours could be the first."}
            </p>
            <Link
              href="/#menu"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-xs font-bold text-white shadow-md transition-colors hover:bg-emerald-800"
            >
              <span className="material-symbols-outlined text-[17px]">
                restaurant_menu
              </span>
              Browse the menu
            </Link>
          </div>
        )}

        {/* ---------------------------------------------------------- CTA */}
        <div className="mt-9 text-center">
          <a
            href={googleReviewUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-outline-variant)] bg-white px-5 py-2.5 text-xs font-bold text-[var(--color-on-surface)] shadow-sm transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            {/* Google's mark, on the Google action only */}
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Review us on Google
          </a>
        </div>
      </div>
    </section>
  );
}
