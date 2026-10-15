"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import type { ReviewTarget, ReviewableItem } from "@/components/orders/review-prompt-modal";

const ReviewPromptModal = dynamic(
  () => import("./review-prompt-modal").then((m) => m.ReviewPromptModal),
  { ssr: false }
);
import {
  isOrderHandled,
  isOrderSnoozed,
  markOrderHandled,
  readLocalOrders,
  snoozeOrder,
} from "@/lib/reviews-local";

/**
 * Watches for delivered orders and opens the review prompt.
 *
 * Mounted once in the root layout, so a customer who has closed the tracking
 * page still gets asked — the brief was "jab order delivered hojaye tu us item
 * ke liye review ka popup show hojaye", not "…on one particular page".
 *
 * Three rules keep it from being a nuisance:
 *   - it waits for the browser to go idle, so it never competes with first paint
 *   - it asks once per order and remembers that in `azlan-reviewed`
 *   - "Not now" is respected for a day, and it does not reappear on every route
 *     change
 *
 * The database calls the state `completed`, not `delivered` — PATCH
 * /api/orders/[id] rewrites the status on the way in.
 */

/** Orders older than this are not worth asking about any more. */
const MAX_ORDER_AGE_MS = 14 * 24 * 60 * 60 * 1000;

/** Give the page a moment to settle before spending a request on this. */
const IDLE_TIMEOUT_MS = 2500;

type ApiOrder = {
  id: string;
  order_number: string;
  status: string;
  order_items?: { item_id: string | null; name_snapshot: string }[] | null;
};

/** Routes where a modal would be in the way, or plain wrong. */
function isQuietRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/rider") ||
    pathname.startsWith("/cart")
  );
}

function runWhenIdle(fn: () => void): () => void {
  type IdleWindow = Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };
  const w = window as IdleWindow;

  if (typeof w.requestIdleCallback === "function") {
    const handle = w.requestIdleCallback(fn, { timeout: IDLE_TIMEOUT_MS });
    return () => w.cancelIdleCallback?.(handle);
  }
  const timer = window.setTimeout(fn, IDLE_TIMEOUT_MS);
  return () => window.clearTimeout(timer);
}

export function ReviewWatcher() {
  const pathname = usePathname();
  const [target, setTarget] = useState<ReviewTarget | null>(null);
  // A ref, not state: React 19's `set-state-in-effect` rule is an error in this
  // project, and this only has to survive the effect, not cause a render.
  const checkedRef = useRef(false);

  const check = useCallback(async () => {
    const cutoff = Date.now() - MAX_ORDER_AGE_MS;
    const stored = readLocalOrders().filter((o) => !o.timestamp || o.timestamp > cutoff);

    // Skip the request entirely when every stored order has been dealt with —
    // which is the common case for a returning customer.
    const candidates = stored.filter(
      (o) => o.orderNumber && !(o.id && (isOrderHandled(o.id) || isOrderSnoozed(o.id)))
    );
    if (candidates.length === 0) return;

    const numbers = candidates
      .map((o) => o.orderNumber)
      .filter((n): n is string => Boolean(n))
      .slice(0, 10);

    let orders: ApiOrder[] = [];
    try {
      const res = await fetch(
        `/api/orders?numbers=${encodeURIComponent(numbers.join(","))}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const data = (await res.json()) as { orders?: ApiOrder[] };
      orders = data.orders ?? [];
    } catch {
      return; // Offline. We will look again on the next page load.
    }

    for (const order of orders) {
      if (order.status !== "completed") continue;
      if (isOrderHandled(order.id) || isOrderSnoozed(order.id)) continue;

      const items: ReviewableItem[] = [];
      for (const line of order.order_items ?? []) {
        // A line whose product has since been deleted has no item_id, and a
        // review has to attach to a product.
        if (!line.item_id) continue;
        if (items.some((i) => i.itemId === line.item_id)) continue;
        items.push({ itemId: line.item_id, name: line.name_snapshot });
      }

      if (items.length === 0) {
        markOrderHandled(order.id);
        continue;
      }

      setTarget({ orderId: order.id, orderNumber: order.order_number, items });
      return; // One order at a time.
    }
  }, []);

  useEffect(() => {
    // Once per page load, not once per route change.
    if (checkedRef.current || isQuietRoute(pathname)) return;
    checkedRef.current = true;
    return runWhenIdle(() => {
      void check();
    });
  }, [check, pathname]);

  if (!target) return null;

  return (
    <ReviewPromptModal
      target={target}
      onClose={() => {
        snoozeOrder(target.orderId);
        setTarget(null);
      }}
      onCompleted={(reviewedItemIds) => {
        markOrderHandled(target.orderId, reviewedItemIds);
        setTarget(null);
      }}
    />
  );
}
