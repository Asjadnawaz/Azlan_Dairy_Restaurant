"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase/client";
import { onAuthStateChange } from "@/lib/supabase/auth";
import type {
  Order,
  OrderItem,
  OrderStatus,
  Rider,
} from "@/lib/supabase/database.types";
import { RiderProfileForm } from "./rider-profile-form";
import { RiderLogin } from "./rider-login";
import { RiderOrderFocus } from "./rider-order-focus";
import { RiderShiftSummary } from "./rider-shift-summary";
import { RiderConfirmDialog } from "./rider-confirm-dialog";
import {
  RIDER_TOAST,
  getStage,
  isActiveOrder,
  nextStatusFor,
  parseOrderNote,
  playRiderChime,
  primeRiderChime,
  syncAgoUrdu,
  vibrate,
} from "./rider-utils";

type Section = "delivery" | "shift" | "profile";

const SECTIONS: { key: Section; label: string; icon: string }[] = [
  { key: "delivery", label: "Delivery", icon: "two_wheeler" },
  { key: "shift", label: "Aaj Ka Kaam", icon: "payments" },
  { key: "profile", label: "Profile", icon: "person" },
];

/** Anything older than this and the screen is warned about, not trusted. */
const STALE_AFTER_MS = 90_000;

/* Connectivity read straight from the browser, so no effect has to mirror it. */
function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}
const getOnline = () => navigator.onLine;
const getOnlineOnServer = () => true;

export function RiderDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItemsMap, setOrderItemsMap] = useState<
    Record<string, OrderItem[]>
  >({});
  const [rider, setRider] = useState<Rider | null>(null);
  const [loading, setLoading] = useState(true);
  const [authNeeded, setAuthNeeded] = useState(false);
  // Signed in, but this account is not a rider — worth saying out loud, or the
  // login screen just reappears and looks like the password was wrong.
  const [notRider, setNotRider] = useState(false);

  const [section, setSection] = useState<Section>("delivery");
  const [focusIndex, setFocusIndex] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmOrder, setConfirmOrder] = useState<Order | null>(null);
  const [pagerFlash, setPagerFlash] = useState(false);

  // Connection state — a rider on mobile data needs to know when to distrust
  // what is on screen, and needs a way to force a refresh.
  const online = useSyncExternalStore(
    subscribeOnline,
    getOnline,
    getOnlineOnServer
  );
  const [realtimeUp, setRealtimeUp] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Ticks forward on a timer so relative times and the stale warning stay honest
  // without reading the clock during render.
  const [now, setNow] = useState<number | null>(null);

  const isFetchingRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const knownActiveIdsRef = useRef<Set<string>>(new Set());
  const hasSyncedOnceRef = useRef(false);

  const fetchRiderAndOrders = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const res = await fetch("/api/rider/orders", { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setNotRider(res.status === 403);
          setAuthNeeded(true);
        }
        return;
      }
      const data = await res.json();
      if (!data.rider) {
        setAuthNeeded(true);
        return;
      }

      setAuthNeeded(false);
      setNotRider(false);
      setRider(data.rider as Rider);
      const nextOrders = (data.orders as Order[]) || [];
      setOrders(nextOrders);
      if (data.itemsMap) {
        setOrderItemsMap(data.itemsMap as Record<string, OrderItem[]>);
      }
      setLastSyncedAt(Date.now());

      // Alert on newly assigned work. Ids rather than a count, because one order
      // completing while another arrives leaves the count unchanged — and the
      // first order of the shift has to ring too.
      const activeIds = new Set(
        nextOrders.filter(isActiveOrder).map((o) => o.id)
      );
      if (hasSyncedOnceRef.current) {
        const arrived = [...activeIds].filter(
          (id) => !knownActiveIdsRef.current.has(id)
        );
        if (arrived.length > 0) {
          playRiderChime();
          vibrate([200, 100, 200]);
          setPagerFlash(true);
          toast.info(
            arrived.length === 1
              ? "Naya order aaya hai"
              : `${arrived.length} naye order aaye hain`,
            { ...RIDER_TOAST, duration: 6000 }
          );
        }
      }
      knownActiveIdsRef.current = activeIds;
      hasSyncedOnceRef.current = true;
    } catch (err) {
      console.error("Rider data fetch failed:", err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  /** The header's refresh button — the rider's escape hatch from a stale screen. */
  const manualRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchRiderAndOrders();
    } finally {
      setRefreshing(false);
    }
  }, [fetchRiderAndOrders]);

  const debouncedFetch = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      void fetchRiderAndOrders();
    }, 400);
  }, [fetchRiderAndOrders]);

  /* First load + auth changes ---------------------------------------------- */
  useEffect(() => {
    // Kicked off a tick later: the fetch sets state, and that belongs in a
    // callback rather than the synchronous body of an effect.
    const kickoff = setTimeout(() => void fetchRiderAndOrders(), 0);

    const authSub = onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setAuthNeeded(true);
      // TOKEN_REFRESHED matters as much as SIGNED_IN: the poll stops while
      // authNeeded is set, so if an expired token is what caused the 401, this
      // event is what gets the rider back to work without a manual refresh.
      else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        void fetchRiderAndOrders();
      }
    });

    return () => {
      clearTimeout(kickoff);
      authSub.unsubscribe();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [fetchRiderAndOrders]);

  /* Realtime, scoped to this rider ----------------------------------------- */
  const riderId = rider?.id;
  const riderUserId = rider?.user_id;

  useEffect(() => {
    if (!riderId) return;

    const supabase = createBrowserClient();
    const channel = supabase.channel(`rider-orders-${riderId}`);

    // Orders are matched on either key by /api/rider/orders, since older rows
    // were assigned with the auth user id instead of the riders row id.
    const assignedKeys =
      riderUserId && riderUserId !== riderId ? [riderId, riderUserId] : [riderId];

    for (const key of assignedKeys) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `rider_id=eq.${key}`,
        },
        () => debouncedFetch()
      );
    }

    channel.subscribe((status) => setRealtimeUp(status === "SUBSCRIBED"));

    return () => {
      setRealtimeUp(false);
      void supabase.removeChannel(channel);
    };
  }, [riderId, riderUserId, debouncedFetch]);

  /* Fallback polling + connection listeners -------------------------------- */
  useEffect(() => {
    // Nothing to poll for until there is a session. Without this the login screen
    // fires a doomed request every 10 seconds for as long as the phone is on it —
    // an expired session overnight would spend the morning burning mobile data on
    // 401s. Signing in restarts the poll, because onAuthStateChange fetches and
    // clears authNeeded; the header's refresh button is the manual way back.
    if (authNeeded) return;

    // An un-assignment never reaches a filtered subscription, and websockets die
    // quietly on patchy mobile data, so a poll always runs underneath. It leans
    // faster while realtime is down.
    const pollMs = realtimeUp ? 25_000 : 10_000;
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") void fetchRiderAndOrders();
    }, pollMs);

    const onVisibility = () => {
      if (document.visibilityState === "visible") void fetchRiderAndOrders();
    };
    const onOnline = () => void fetchRiderAndOrders();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);

    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [fetchRiderAndOrders, realtimeUp, authNeeded]);

  /* Keeps "18 min" and the stale warning honest without a fetch -------------- */
  useEffect(() => {
    if (authNeeded) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") setNow(Date.now());
    }, 15_000);
    return () => clearInterval(t);
  }, [authNeeded]);

  useEffect(() => {
    if (!pagerFlash) return;
    const t = setTimeout(() => setPagerFlash(false), 1400);
    return () => clearTimeout(t);
  }, [pagerFlash]);

  const activeOrders = orders.filter(isActiveOrder);

  // Finishing order 1 of 3 leaves the rider looking at the next one, and the
  // index can never point past the end of a list that just shrank.
  const focusIndexInRange = activeOrders.length
    ? Math.min(focusIndex, activeOrders.length - 1)
    : 0;

  const updateOrderStatus = async (order: Order, status: OrderStatus) => {
    if (updatingId) return;
    setUpdatingId(order.id);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update nahi hua");

      if (status === "picked_up") {
        toast.success("Order utha liya", RIDER_TOAST);
      } else if (status === "delivering") {
        toast.success("Raste mein — dhyan se chalayein", RIDER_TOAST);
      } else if (status === "completed") {
        const { isCod } = parseOrderNote(order.customer_note);
        toast.success(
          isCod
            ? `Ho gaya — Rs ${order.total.toLocaleString()} cash aap ke paas`
            : "Ho gaya — is order ka paisa online aa chuka tha",
          RIDER_TOAST
        );
        vibrate([150, 80, 150]);
      }

      setConfirmOrder(null);
      await fetchRiderAndOrders();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Update nahi hua",
        RIDER_TOAST
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAdvance = (order: Order) => {
    const stage = getStage(order.status);
    // Delivery is the one step that cannot be undone, so it gets a confirmation.
    if (stage === 3) {
      setConfirmOrder(order);
      return;
    }
    void updateOrderStatus(order, nextStatusFor(stage));
  };

  if (authNeeded) {
    return (
      <RiderLogin
        notRider={notRider}
        onSignedIn={() => {
          setAuthNeeded(false);
          setLoading(true);
          hasSyncedOnceRef.current = false;
          knownActiveIdsRef.current = new Set();
          toast.success("Salam! Duty shuru.", RIDER_TOAST);
          void fetchRiderAndOrders();
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="rider-shell min-h-dvh flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-[32px] animate-spin text-[var(--r-cash)]">
            progress_activity
          </span>
          <p className="text-sm font-bold text-[var(--r-muted)]">
            Load ho raha hai…
          </p>
        </div>
      </div>
    );
  }

  // The server recomputes rider status from assigned work on every fetch, so
  // this is a readout of what it decided — not a control that pretends to set it.
  const duty =
    rider?.status === "busy"
      ? { label: "Delivery par", color: "var(--r-nav)" }
      : rider?.status === "offline"
        ? { label: "Off duty", color: "var(--r-muted)" }
        : { label: "Free", color: "var(--r-shop)" };

  const isStale =
    lastSyncedAt !== null && now !== null && now - lastSyncedAt > STALE_AFTER_MS;

  return (
    <div className="rider-shell min-h-dvh" onPointerDown={primeRiderChime}>
      <header className="sticky top-0 z-20 bg-[var(--r-bg)] border-b border-[var(--r-line)]">
        <div className="max-w-md mx-auto px-4 pt-3 pb-2.5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-integral text-base truncate leading-tight">
                {rider?.name || "Rider"}
              </h1>
              <p className="flex items-center gap-1.5 mt-1">
                <span
                  aria-hidden
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: duty.color }}
                />
                <span
                  className="text-[11px] font-extrabold uppercase tracking-[0.16em]"
                  style={{ color: duty.color }}
                >
                  {duty.label}
                </span>
              </p>
            </div>

            <button
              type="button"
              aria-label="Dobara load karein"
              disabled={refreshing}
              onClick={() => void manualRefresh()}
              className="w-12 h-12 shrink-0 rounded-xl bg-[var(--r-raised)] border border-[var(--r-line)] flex items-center justify-center cursor-pointer active:opacity-70 disabled:opacity-50"
            >
              <span
                className={`material-symbols-outlined text-[22px] ${refreshing ? "animate-spin" : ""}`}
              >
                refresh
              </span>
            </button>
          </div>

          <nav className="grid grid-cols-3 gap-1.5">
            {SECTIONS.map((s) => {
              const active = section === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => setSection(s.key)}
                  className={`min-h-11 rounded-xl flex items-center justify-center gap-1.5 px-2 text-[11px] font-extrabold uppercase tracking-[0.08em] cursor-pointer transition-colors ${
                    active
                      ? "bg-[var(--r-raised)] text-[var(--r-text)]"
                      : "text-[var(--r-muted)]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {s.icon}
                  </span>
                  <span className="truncate">{s.label}</span>
                  {s.key === "delivery" && activeOrders.length > 0 && (
                    <span className="tnum text-[10px] px-1.5 rounded-full bg-[var(--r-cash)] text-[var(--r-bg)]">
                      {activeOrders.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Connection truth-telling: only speaks up when the screen may be wrong */}
      {!online ? (
        <div
          className="px-4 py-2.5 text-center text-xs font-bold"
          style={{ backgroundColor: "var(--r-alert)", color: "#fff" }}
        >
          Internet nahi hai — screen purani ho sakti hai.
        </div>
      ) : isStale ? (
        <div className="max-w-md mx-auto px-4 pt-3">
          <button
            type="button"
            onClick={() => void manualRefresh()}
            className="w-full min-h-11 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold cursor-pointer"
            style={{
              color: "var(--r-late)",
              borderColor: "color-mix(in srgb, var(--r-late) 45%, transparent)",
            }}
          >
            <span className="material-symbols-outlined text-[16px]">
              sync_problem
            </span>
            <span>{syncAgoUrdu(lastSyncedAt)} — tap kar ke refresh karein</span>
          </button>
        </div>
      ) : null}

      <main className="max-w-md mx-auto px-4 py-4">
        {section === "delivery" && (
          <RiderOrderFocus
            orders={activeOrders}
            index={focusIndexInRange}
            onIndexChange={setFocusIndex}
            itemsMap={orderItemsMap}
            updatingId={updatingId}
            onAdvance={handleAdvance}
            pagerFlash={pagerFlash}
          />
        )}

        {section === "shift" && <RiderShiftSummary orders={orders} />}

        {section === "profile" && (
          <div className="space-y-4">
            <h2 className="font-integral text-lg">Meri Profile</h2>
            <RiderProfileForm initialRider={rider} />
            {lastSyncedAt && (
              <p className="text-xs text-[var(--r-muted)] text-center pt-2">
                {syncAgoUrdu(lastSyncedAt)}
              </p>
            )}
          </div>
        )}
      </main>

      {confirmOrder && (
        <RiderConfirmDialog
          order={confirmOrder}
          isCod={parseOrderNote(confirmOrder.customer_note).isCod}
          saving={updatingId === confirmOrder.id}
          onCancel={() => setConfirmOrder(null)}
          onConfirm={() => void updateOrderStatus(confirmOrder, "completed")}
        />
      )}
    </div>
  );
}
