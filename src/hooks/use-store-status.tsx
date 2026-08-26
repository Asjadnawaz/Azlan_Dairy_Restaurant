"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  getStoreOpenStatus,
  toStoreStatusPayload,
  type StoreScheduleSettings,
  type StoreStatusPayload,
} from "@/lib/store-hours";

/**
 * One shared answer to "is the shop open?", for every client component.
 *
 * Before this, the hero, the closed banner and the welcome modal each opened
 * their own `settings` realtime channel *and* ran their own 15-second interval —
 * three sockets and 720 timer wake-ups an hour to display the same boolean, and
 * each one wrote it into state from an effect (React 19 flags that as an error
 * here). This module keeps the state outside React, so:
 *
 *   - one realtime channel and one pair of timers for the whole page, started on
 *     the first subscriber and torn down after the last;
 *   - the clock is re-read locally every 30s, which costs nothing, while the
 *     network is only asked every 5 minutes (or when a `settings` row changes,
 *     or when the tab comes back to the foreground);
 *   - the server's answer is used verbatim for the first paint, so hydration
 *     matches byte for byte and nothing flashes.
 */

const LOCAL_TICK_MS = 30_000;
const NETWORK_REFRESH_MS = 5 * 60_000;
/** Don't re-ask on tab focus if we just asked. */
const FOREGROUND_MIN_AGE_MS = 60_000;

/* -------------------------------------------------------------------------- */
/* The store (plain module state — deliberately outside React)                 */
/* -------------------------------------------------------------------------- */

let schedule: StoreScheduleSettings | null = null;
/** null until the first client-side computation; the seed covers that gap. */
let snapshot: StoreStatusPayload | null = null;
let snapshotKey = "";

const listeners = new Set<() => void>();

type Channel = ReturnType<ReturnType<typeof createBrowserClient>["channel"]>;
let channel: Channel | null = null;
let tickTimer: ReturnType<typeof setInterval> | null = null;
let networkTimer: ReturnType<typeof setInterval> | null = null;
let lastFetchAt = 0;

/** Recompute from the current schedule + the current clock, and notify if changed. */
function publish() {
  const next = toStoreStatusPayload(getStoreOpenStatus(schedule));
  // Cheap structural compare: the payload is small and flat, and keeping the
  // same object identity when nothing moved avoids waking every consumer twice
  // a minute for no reason.
  const key = JSON.stringify(next);
  if (key === snapshotKey && snapshot) return;
  snapshotKey = key;
  snapshot = next;
  for (const listener of listeners) listener();
}

async function refresh() {
  try {
    const res = await fetch("/api/store-status", { cache: "no-store" });
    if (!res.ok) return;
    const body = (await res.json()) as { schedule?: StoreScheduleSettings };
    if (body?.schedule) schedule = body.schedule;
    lastFetchAt = Date.now();
    publish();
  } catch {
    // Offline or mid-deploy: keep ticking the last known schedule rather than
    // pretending the shop closed.
  }
}

function handleVisibility() {
  if (document.visibilityState !== "visible") return;
  // A phone that was asleep for hours needs both a fresh clock reading and,
  // if it has been a while, a fresh schedule.
  publish();
  if (Date.now() - lastFetchAt > FOREGROUND_MIN_AGE_MS) void refresh();
}

function start() {
  const supabase = createBrowserClient();
  channel = supabase
    .channel("azlan-store-status")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "settings" },
      (payload) => {
        const row = payload.new as (StoreScheduleSettings & { id?: number }) | null;
        if (row && Number(row.id) === 1) {
          schedule = {
            is_active: row.is_active ?? null,
            open_mode: row.open_mode ?? null,
            force_open_until: row.force_open_until ?? null,
            open_hour: row.open_hour ?? null,
            close_hour: row.close_hour ?? null,
          };
          publish();
        } else {
          void refresh();
        }
      }
    )
    .subscribe();

  tickTimer = setInterval(publish, LOCAL_TICK_MS);
  networkTimer = setInterval(() => void refresh(), NETWORK_REFRESH_MS);
  document.addEventListener("visibilitychange", handleVisibility);

  void refresh();
}

function stop() {
  if (channel) {
    void createBrowserClient().removeChannel(channel);
    channel = null;
  }
  if (tickTimer) clearInterval(tickTimer);
  if (networkTimer) clearInterval(networkTimer);
  tickTimer = null;
  networkTimer = null;
  document.removeEventListener("visibilitychange", handleVisibility);
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  if (listeners.size === 1) start();
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0) stop();
  };
}

function getSnapshot(): StoreStatusPayload | null {
  return snapshot;
}

/** Nothing is known during SSR — the seed from the server is used instead. */
function getServerSnapshot(): StoreStatusPayload | null {
  return null;
}

/* -------------------------------------------------------------------------- */
/* Seeding from the server                                                    */
/* -------------------------------------------------------------------------- */

type Seed = {
  status: StoreStatusPayload;
  schedule: StoreScheduleSettings;
};

const SeedContext = createContext<Seed | null>(null);

/**
 * Wraps the customer site once, in the root layout, with the status the server
 * already computed. Consumers render that verbatim until the store takes over
 * after mount, which is what keeps hydration stable.
 */
export function StoreStatusProvider({
  seed,
  children,
}: {
  seed: Seed;
  children: ReactNode;
}) {
  // Fill the module's schedule slot from the server's answer so the first local
  // tick has something real to compute from, instead of waiting for the network.
  // It runs in an effect rather than during render because module state is
  // shared across requests on the server and writing to it while rendering is a
  // side effect either way. Nothing reads `schedule` synchronously before this:
  // `start()` only schedules work, and until the store produces its first
  // snapshot every consumer renders `seed.status`.
  useEffect(() => {
    if (schedule === null) schedule = seed.schedule;
  }, [seed]);

  return <SeedContext.Provider value={seed}>{children}</SeedContext.Provider>;
}

/** Last resort for a consumer rendered outside the provider. */
let orphanFallback: StoreStatusPayload | null = null;
function getOrphanFallback(): StoreStatusPayload {
  return (orphanFallback ??= toStoreStatusPayload(getStoreOpenStatus(null)));
}

/* -------------------------------------------------------------------------- */
/* The hook                                                                   */
/* -------------------------------------------------------------------------- */

export function useStoreStatus(): StoreStatusPayload {
  const seed = useContext(SeedContext);
  const live = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return live ?? seed?.status ?? getOrphanFallback();
}

/** Convenience for the many places that only care about the boolean. */
export function useStoreIsOpen(): boolean {
  return useStoreStatus().isOpen;
}

/**
 * Forces an immediate re-read. The admin store toggle uses this after a write so
 * a second tab does not have to wait for the realtime event.
 */
export function refreshStoreStatus(): void {
  void refresh();
}
