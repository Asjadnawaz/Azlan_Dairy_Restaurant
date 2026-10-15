import { cache } from "react";
import { unstable_cache, revalidateTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { hasSupabaseEnv, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * Public reviews, read once and cached. **Server-only** — do not import from a
 * `"use client"` file.
 *
 * The homepage testimonials used to be three invented five-star reviews shipped
 * as both the initial state and the permanent fallback, with a client-side
 * `select … limit 6` in an effect on top. Everything here is real: the average
 * and the count are computed from actual rows, and an empty table renders an
 * honest empty state rather than fiction.
 */

export const REVIEWS_CACHE_TAG = "azlan-reviews";

/** A review is written a few times a day at most, and POST revalidates. */
const REVIEWS_TTL_SECONDS = 300;

/** How many written reviews the homepage carousel shows. */
const FEATURED_LIMIT = 9;

/** Ceiling on the rows pulled to compute the average. Plenty for one shop. */
const RATING_SAMPLE_LIMIT = 2000;

export type PublicReview = {
  id: string;
  /** Display name, already shortened — see `shortenName`. */
  name: string;
  rating: number;
  comment: string;
  created_at: string;
  /** Product the review is about, when it could be resolved. */
  itemName: string | null;
  isVerified: boolean;
};

export type ReviewsSummary = {
  /** Mean rating across every review, rounded to one decimal. 0 when none. */
  average: number;
  /** Total reviews, including the ones with no written comment. */
  count: number;
  /** Reviews that actually say something — the only ones worth displaying. */
  featured: PublicReview[];
};

export const EMPTY_REVIEWS_SUMMARY: ReviewsSummary = {
  average: 0,
  count: 0,
  featured: [],
};

/** Anon key, no cookies — required for the read to be cacheable. */
function createPublicClient() {
  return createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * "Muhammad Tariq Mahmood" → "Muhammad T." Customers gave us their name to get
 * an order delivered, not to have it published in full next to their review.
 */
function shortenName(raw: string | null): string {
  const parts = (raw || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Customer";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

type ReviewRow = {
  id: string;
  customer_name: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  is_verified: boolean | null;
  items: { name: string } | { name: string }[] | null;
};

/** Supabase types an embedded row as either shape depending on the relation. */
function itemName(items: ReviewRow["items"]): string | null {
  if (!items) return null;
  const row = Array.isArray(items) ? items[0] : items;
  return row?.name ?? null;
}

const loadReviews = unstable_cache(
  async (): Promise<ReviewsSummary> => {
    if (!hasSupabaseEnv()) return EMPTY_REVIEWS_SUMMARY;
    const supabase = createPublicClient();

    const [featuredResult, ratingsResult] = await Promise.all([
      supabase
        .from("reviews")
        .select("id, customer_name, rating, comment, created_at, is_verified, items(name)")
        .not("comment", "is", null)
        .neq("comment", "")
        .order("created_at", { ascending: false })
        .limit(FEATURED_LIMIT),
      supabase.from("reviews").select("rating").limit(RATING_SAMPLE_LIMIT),
    ]);

    if (featuredResult.error || ratingsResult.error) {
      console.error(
        "Failed to read reviews:",
        featuredResult.error?.message ?? ratingsResult.error?.message
      );
      return EMPTY_REVIEWS_SUMMARY;
    }

    const ratings = (ratingsResult.data ?? []) as { rating: number }[];
    const count = ratings.length;
    const average =
      count === 0
        ? 0
        : Math.round((ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / count) * 10) / 10;

    const featured = ((featuredResult.data ?? []) as ReviewRow[]).map((row) => ({
      id: row.id,
      name: shortenName(row.customer_name),
      rating: row.rating,
      comment: (row.comment || "").trim(),
      created_at: row.created_at,
      itemName: itemName(row.items),
      isVerified: row.is_verified !== false,
    }));

    return { average, count, featured };
  },
  ["azlan-public-reviews"],
  { tags: [REVIEWS_CACHE_TAG], revalidate: REVIEWS_TTL_SECONDS }
);

/** Cached review summary, deduplicated within a single render pass. */
export const getPublicReviews = cache(async (): Promise<ReviewsSummary> => loadReviews());

/** Drop the cached reviews — called by POST /api/reviews. */
export function revalidateReviews(): void {
  // Two-argument form: the single-argument call is deprecated in Next 16, and
  // `{ expire: 0 }` keeps the immediate expiration this relies on.
  revalidateTag(REVIEWS_CACHE_TAG, { expire: 0 });
}
