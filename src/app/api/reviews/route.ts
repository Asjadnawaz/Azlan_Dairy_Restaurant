import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidateReviews } from "@/lib/reviews.server";
import { revalidateMenu } from "@/lib/menu.server";
import { sanitizePhone } from "@/lib/sanitize";

/**
 * Reviews.
 *
 * Why this route exists at all: the browser used to `insert` into `reviews`
 * directly, and every one of those inserts was silently rejected — `reviews`
 * has a public SELECT policy and no INSERT policy, so the table has been empty
 * this whole time while the UI showed a success toast. Rather than opening the
 * table to the anon key (which would let anyone post any rating against any
 * product), the service-role client here is the only writer, and it can prove
 * the things that make a review genuine:
 *
 *   - the order exists and is `completed` (see PATCH /api/orders/[id]: it
 *     rewrites `delivered` → `completed`, so `completed` is the delivered state)
 *   - the item was really in that order, via `order_items`
 *   - the rating is 1–5
 *   - this (order, item) has not been reviewed already
 *
 * `items.rating` and `items.review_count` are recomputed by the database
 * trigger `on_review_change`; nothing here touches them.
 */

const MAX_COMMENT_LENGTH = 500;

/**
 * Reviews are prose, so `sanitizeText` (which strips apostrophes, `!` and `?`)
 * is the wrong tool. Strip markup and control characters, keep the sentence.
 */
function sanitizeComment(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const cleaned = Array.from(input.replace(/<[^>]*>/g, " "))
    // Control characters survive the tag strip and are never intentional.
    .map((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code < 32 || code === 127 ? " " : ch;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_COMMENT_LENGTH);
  return cleaned.length > 0 ? cleaned : null;
}

function sanitizeName(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

/* -------------------------------------------------------------------------- */
/* GET /api/reviews?item_id=…                                                 */
/* -------------------------------------------------------------------------- */

export async function GET(req: NextRequest) {
  try {
    const itemId = req.nextUrl.searchParams.get("item_id");
    if (!itemId) {
      return NextResponse.json({ error: "item_id is required" }, { status: 400 });
    }

    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("reviews")
        .select("id, customer_name, rating, comment, created_at, is_verified")
        .eq("item_id", itemId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        return NextResponse.json({ reviews: [], average: 0, count: 0 });
      }

      const rows = (data ?? []) as {
        id: string;
        customer_name: string | null;
        rating: number;
        comment: string | null;
        created_at: string;
        is_verified: boolean | null;
      }[];

      // Customers gave us a full name to get an order delivered, not to have it
      // published — publish "Ahmed K." instead.
      const reviews = rows.map((row) => {
        const parts = (row.customer_name || "").trim().split(/\s+/).filter(Boolean);
        const name =
          parts.length === 0
            ? "Customer"
            : parts.length === 1
              ? parts[0]
              : `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
        return {
          id: row.id,
          name,
          rating: row.rating,
          comment: row.comment,
          created_at: row.created_at,
          is_verified: row.is_verified !== false,
        };
      });

      const count = reviews.length;
      const average =
        count === 0
          ? 0
          : Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10;

      return NextResponse.json({ reviews, average, count });
    } catch {
      return NextResponse.json({ reviews: [], average: 0, count: 0 });
    }
  } catch (err) {
    console.error("Get reviews exception:", err);
    return NextResponse.json({ reviews: [], average: 0, count: 0 });
  }
}

/* -------------------------------------------------------------------------- */
/* POST /api/reviews                                                          */
/* -------------------------------------------------------------------------- */

type ReviewBody = {
  order_id?: unknown;
  item_id?: unknown;
  rating?: unknown;
  comment?: unknown;
  customer_name?: unknown;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ReviewBody;

    const orderId = typeof body.order_id === "string" ? body.order_id.trim() : "";
    const itemId = typeof body.item_id === "string" ? body.item_id.trim() : "";
    const rating = typeof body.rating === "number" ? Math.round(body.rating) : NaN;

    if (!orderId || !itemId) {
      return NextResponse.json(
        { error: "order_id and item_id are required" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Please choose a rating between 1 and 5 stars" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 1. The order has to exist and be delivered. `delivered` is stored as
    //    `completed`, so that is the state we require.
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, status, customer_name, customer_phone")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      console.error("Review order lookup failed:", orderError.message);
      return NextResponse.json({ error: "Could not save your review" }, { status: 500 });
    }
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.status !== "completed") {
      return NextResponse.json(
        { error: "You can review an order once it has been delivered" },
        { status: 403 }
      );
    }

    // 2. The item has to have actually been in that order.
    const { data: line, error: lineError } = await admin
      .from("order_items")
      .select("id")
      .eq("order_id", orderId)
      .eq("item_id", itemId)
      .limit(1)
      .maybeSingle();

    if (lineError) {
      console.error("Review line lookup failed:", lineError.message);
      return NextResponse.json({ error: "Could not save your review" }, { status: 500 });
    }
    if (!line) {
      return NextResponse.json(
        { error: "That item was not part of this order" },
        { status: 403 }
      );
    }

    // 3. One review per item per order. The unique index in
    //    supabase/migrations/20260825_customer_flow.sql enforces this even
    //    against a double-submit; this check produces the friendlier message.
    const { data: existing } = await admin
      .from("reviews")
      .select("id")
      .eq("order_id", orderId)
      .eq("item_id", itemId)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "You have already reviewed this item" },
        { status: 409 }
      );
    }

    // The name and phone come from the order, not from the request — a review
    // is attributed to whoever the delivery went to.
    const insert = {
      order_id: orderId,
      item_id: itemId,
      customer_name: sanitizeName(order.customer_name) || sanitizeName(body.customer_name) || "Customer",
      customer_phone: sanitizePhone(order.customer_phone),
      rating,
      // Empty message stays empty. The old client wrote "Delicious food!" for
      // anyone who left the box blank, which is a fabricated review.
      comment: sanitizeComment(body.comment),
      is_verified: true,
    };

    const { data: review, error: insertError } = await admin
      .from("reviews")
      .insert(insert)
      .select("id, rating, comment, created_at")
      .single();

    if (insertError) {
      // 23505 = unique violation, i.e. the same review raced in twice.
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "You have already reviewed this item" },
          { status: 409 }
        );
      }
      console.error("Failed to insert review:", insertError);
      return NextResponse.json({ error: "Could not save your review" }, { status: 500 });
    }

    // The trigger has just changed items.rating / review_count, and both the
    // homepage reviews and the menu are cached reads.
    revalidateReviews();
    revalidateMenu();

    return NextResponse.json({ success: true, review });
  } catch (err) {
    console.error("Create review exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
