/**
 * Which orders the review prompt has already asked about.
 *
 * Kept in `localStorage` rather than the database because guests place most
 * orders and there is no row to hang "already asked" off. Two writers share it —
 * the site-wide watcher (src/components/azlan/review-watcher.tsx) and the rate
 * card on the tracking page — so it lives here instead of in either of them.
 *
 * Browser-only. Every read is defensive: private mode throws on access, and a
 * lost record only means the customer gets asked once more.
 */

const REVIEWED_KEY = "azlan-reviewed";
const SNOOZE_KEY = "azlan-review-snooze";

/** How long "Not now" keeps one order quiet. */
const SNOOZE_MS = 24 * 60 * 60 * 1000;

/** Item ids reviewed, keyed by order id. The key's presence means "asked". */
export type ReviewedMap = Record<string, string[]>;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Private mode or a full quota — we simply ask again next time. */
  }
}

export function readReviewed(): ReviewedMap {
  return readJson<ReviewedMap>(REVIEWED_KEY, {});
}

/* -------------------------------------------------------------------------- */
/* Change notification                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Components render off this record, and `localStorage` is not reactive — nor is
 * it readable during server rendering. Reading it straight from a render body
 * would make the server's HTML and the browser's first render disagree, so
 * consumers pair `subscribeReviewed` with `useSyncExternalStore` (React then
 * uses the server value for hydration and swaps in the real one straight after).
 */
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribeReviewed(onChange: () => void): () => void {
  listeners.add(onChange);
  // Another tab reviewing the same order counts too.
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === REVIEWED_KEY || event.key === SNOOZE_KEY) {
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** True once this order has been asked about, whatever the answer was. */
export function isOrderHandled(orderId: string): boolean {
  return readReviewed()[orderId] !== undefined;
}

/** Item ids of this order that carry a review. */
export function reviewedItemsFor(orderId: string): string[] {
  return readReviewed()[orderId] ?? [];
}

/** Marks the order asked-about, merging in whatever was actually rated. */
export function markOrderHandled(orderId: string, reviewedItemIds: string[] = []): void {
  const reviewed = readReviewed();
  const merged = new Set([...(reviewed[orderId] ?? []), ...reviewedItemIds]);
  reviewed[orderId] = Array.from(merged);
  writeJson(REVIEWED_KEY, reviewed);
  notify();
}

export function snoozeOrder(orderId: string): void {
  const snoozed = readJson<Record<string, number>>(SNOOZE_KEY, {});
  snoozed[orderId] = Date.now() + SNOOZE_MS;
  writeJson(SNOOZE_KEY, snoozed);
  notify();
}

export function isOrderSnoozed(orderId: string): boolean {
  return (readJson<Record<string, number>>(SNOOZE_KEY, {})[orderId] ?? 0) > Date.now();
}

/** Orders in `azlan-orders`, as the cart writes them. */
export type StoredOrder = {
  id?: string;
  orderNumber?: string;
  phone?: string;
  total?: number;
  status?: string;
  timestamp?: number;
  items?: { id: string; name: string; price: number; quantity: number; image_path?: string | null }[];
};

export const LOCAL_ORDERS_KEY = "azlan-orders";

export function readLocalOrders(): StoredOrder[] {
  const value = readJson<StoredOrder[]>(LOCAL_ORDERS_KEY, []);
  return Array.isArray(value) ? value : [];
}
