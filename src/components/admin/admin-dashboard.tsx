"use client";

/**
 * Admin state owner.
 *
 * This component holds everything the whole dashboard shares — orders, line
 * items, riders, aggregates, the realtime channels, the store flag and the
 * receipt printer — and hands it to `AdminShell`, which owns layout only. The
 * split matters because the realtime subscription must outlive every section
 * switch: a new order has to land whether the admin is looking at Orders or at
 * Customers.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createBrowserClient } from "@/lib/supabase/client";
import type {
  Order,
  OrderItem,
  Rider,
  Settings,
} from "@/lib/supabase/database.types";
import type { AdminStats } from "@/lib/admin-stats";
import {
  getStoreOpenStatus,
  type StoreOpenMode,
  type StoreScheduleSettings,
} from "@/lib/store-hours";
import { AdminShell } from "./admin-shell";
import { useMounted } from "@/hooks/use-mounted";
import { ThermalReceipt } from "./thermal-receipt";
import { toast } from "sonner";

interface AdminDashboardProps {
  initialOrders: Order[];
  initialLineItems: OrderItem[];
  /** Fetched once on the server. Previously every order card queried this itself. */
  initialRiders: Rider[];
  /**
   * Aggregates computed on the server alongside the orders. `null` only if that
   * query failed, in which case the client falls back to /api/admin/stats.
   */
  initialStats: AdminStats | null;
  initialStatsTruncated: boolean;
  settings: Settings | null;
  userEmail: string;
  signOutButton: React.ReactNode;
}

const TRUNCATED_NOTE =
  "Totals cover the most recent 5,000 orders — older history is not included.";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function AdminDashboard({
  initialOrders,
  initialLineItems,
  initialRiders,
  initialStats,
  initialStatsTruncated,
  settings,
  userEmail,
  signOutButton,
}: AdminDashboardProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [lineItems, setLineItems] = useState<OrderItem[]>(initialLineItems);
  const [riders] = useState<Rider[]>(initialRiders);

  // The whole schedule, not just the legacy boolean — `force_open` needs its
  // expiry and the hours text has to come from the same row, or the control ends
  // up promising a window the server does not honour.
  const [storeSchedule, setStoreSchedule] = useState<StoreScheduleSettings>({
    is_active: settings?.is_active ?? null,
    open_mode: settings?.open_mode ?? null,
    force_open_until: settings?.force_open_until ?? null,
    open_hour: settings?.open_hour ?? null,
    close_hour: settings?.close_hour ?? null,
  });

  const [stats, setStats] = useState<AdminStats | null>(initialStats);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsNote, setStatsNote] = useState<string | null>(
    initialStats === null
      ? "Could not load business totals."
      : initialStatsTruncated
        ? TRUNCATED_NOTE
        : null
  );

  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [printOrder, setPrintOrder] = useState<{
    order: Order;
    items: OrderItem[];
    paperWidth: "80mm" | "58mm";
  } | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const mounted = useMounted();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const supabaseRef = useRef(createBrowserClient());

  /* ---------------------------------------------------------------------- */
  /* Store availability                                                     */
  /* ---------------------------------------------------------------------- */

  const storeStatus = useMemo(
    () => getStoreOpenStatus(storeSchedule),
    [storeSchedule]
  );

  /** Optimistic mode flip; `StoreToggle` calls it again with the old value on failure. */
  const setStoreMode = useCallback((mode: StoreOpenMode) => {
    setStoreSchedule((prev) => ({
      ...prev,
      open_mode: mode,
      // The real expiry arrives with the route's response (and again over
      // realtime). Until then a null reads as "granted, not yet stamped", which
      // `getStoreOpenStatus` honours rather than closing the shop mid-flip.
      force_open_until: null,
      is_active: mode !== "force_closed",
    }));
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Aggregates                                                             */
  /* ---------------------------------------------------------------------- */

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Failed to load statistics");
      setStats(data.stats as AdminStats);
      setStatsNote(data.truncated ? TRUNCATED_NOTE : null);
    } catch (err: unknown) {
      setStatsNote(getErrorMessage(err, "Could not load business totals."));
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const refreshStats = useCallback(() => {
    setLoadingStats(true);
    void loadStats();
  }, [loadStats]);

  // No fetch on mount in the normal case: the server page already handed us
  // `initialStats`. Only when that seed failed do we reach for the route, and
  // even then the call is deferred off the effect's synchronous path so it
  // cannot cascade a render (which is exactly what the hooks rule guards).
  const seedFailed = initialStats === null;
  useEffect(() => {
    if (!seedFailed) return;
    const id = setTimeout(() => void loadStats(), 0);
    return () => clearTimeout(id);
  }, [seedFailed, loadStats]);

  // A burst of orders at 8pm shouldn't mean a burst of aggregate rebuilds, so
  // realtime activity coalesces into one refresh a few seconds later.
  const statsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleStatsRefresh = useCallback(() => {
    if (statsTimer.current) clearTimeout(statsTimer.current);
    statsTimer.current = setTimeout(refreshStats, 6000);
  }, [refreshStats]);

  useEffect(
    () => () => {
      if (statsTimer.current) clearTimeout(statsTimer.current);
    },
    []
  );

  /* ---------------------------------------------------------------------- */
  /* Printing                                                               */
  /* ---------------------------------------------------------------------- */

  const handleOpenPrintPreview = useCallback(
    (
      orderToPrint: Order,
      itemsToPrint: OrderItem[],
      paperWidth: "80mm" | "58mm" = "80mm"
    ) => {
      setPrintOrder({ order: orderToPrint, items: itemsToPrint, paperWidth });
      setShowPrintModal(true);
    },
    []
  );

  function handleTriggerPrint(width?: "80mm" | "58mm") {
    const finalWidth = width || printOrder?.paperWidth || "80mm";
    if (finalWidth === "58mm") {
      document.body.classList.add("paper-58mm");
    } else {
      document.body.classList.remove("paper-58mm");
    }
    if (printOrder && printOrder.paperWidth !== finalWidth) {
      setPrintOrder({ ...printOrder, paperWidth: finalWidth });
    }
    setIsPrinting(true);
  }

  useEffect(() => {
    if (isPrinting && printOrder) {
      const timer = setTimeout(() => {
        window.print();
        setIsPrinting(false);
        document.body.classList.remove("paper-58mm");
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isPrinting, printOrder]);

  /* ---------------------------------------------------------------------- */
  /* Bulk delete                                                            */
  /* ---------------------------------------------------------------------- */

  async function handleClearAllOrders() {
    if (isClearing) return;
    setIsClearing(true);
    try {
      const res = await fetch("/api/admin/orders", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to clear orders");
      }
      setOrders([]);
      setLineItems([]);
      setShowClearConfirm(false);
      toast.success("All orders cleared successfully!");
      refreshStats();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to clear orders"));
    } finally {
      setIsClearing(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Realtime                                                               */
  /* ---------------------------------------------------------------------- */

  const playAlert = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch((err) => {
      console.warn("Audio playback blocked:", err);
    });
  }, []);

  const fetchedOrderIdsRef = useRef<Set<string>>(new Set());

  /**
   * Pulls line items for a single order. Only ever called for orders that arrive
   * over realtime — the server already sent items for the orders in the initial
   * payload.
   *
   * The order row INSERT event fires before the API route inserts order_items,
   * so the first query often returns empty. We retry up to 3 times with an
   * increasing delay (500ms, 1500ms, 3000ms) to bridge this race condition.
   * The orderId is only marked as "fetched" once items are actually found.
   */
  const fetchLineItems = useCallback(async (orderId: string) => {
    if (fetchedOrderIdsRef.current.has(orderId)) return;

    const delays = [500, 1500, 3000];

    for (let attempt = 0; attempt < delays.length; attempt++) {
      await new Promise((r) => setTimeout(r, delays[attempt]));

      const { data } = await supabaseRef.current
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);

      if (data && data.length > 0) {
        fetchedOrderIdsRef.current.add(orderId);
        setLineItems((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const fresh = (data as OrderItem[]).filter((i) => !existingIds.has(i.id));
          return fresh.length > 0 ? [...prev, ...fresh] : prev;
        });
        return;
      }
    }

    // After all retries, mark as fetched to avoid infinite loops.
    // Realtime INSERT events for order_items will still add them.
    fetchedOrderIdsRef.current.add(orderId);
  }, []);

  useEffect(() => {
    const supabase = supabaseRef.current;

    const orderChannel = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const newOrder = payload.new as Order;
          setOrders((prev) => {
            if (prev.some((o) => o.id === newOrder.id)) return prev;
            return [newOrder, ...prev];
          });
          playAlert();
          // The order row arrives before its items; the INSERT events for
          // order_items may or may not reach us, so ask for them once.
          void fetchLineItems(newOrder.id);
          scheduleStatsRefresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const updated = payload.new as Order;
          setOrders((prev) =>
            prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
          );
          scheduleStatsRefresh();
        }
      )
      .subscribe();

    const itemChannel = supabase
      .channel("admin-order-items")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_items" },
        (payload) => {
          const newItem = payload.new as OrderItem;
          setLineItems((prev) => {
            if (prev.some((i) => i.id === newItem.id)) return prev;
            return [...prev, newItem];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "order_items" },
        (payload) => {
          const updated = payload.new as OrderItem;
          setLineItems((prev) =>
            prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "order_items" },
        (payload) => {
          const oldItem = payload.old as { id: string };
          if (oldItem?.id) {
            setLineItems((prev) => prev.filter((i) => i.id !== oldItem.id));
          }
        }
      )
      .subscribe();

    const settingsChannel = supabase
      .channel("admin-settings")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "settings" },
        (payload) => {
          // A second admin tab (or the lazy force-open lapse on the server) can
          // change the mode under us, so take the whole schedule, not just the
          // legacy boolean.
          const updated = payload.new as Settings;
          setStoreSchedule({
            is_active: updated.is_active ?? null,
            open_mode: updated.open_mode ?? null,
            force_open_until: updated.force_open_until ?? null,
            open_hour: updated.open_hour ?? null,
            close_hour: updated.close_hour ?? null,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(itemChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, [playAlert, fetchLineItems, scheduleStatsRefresh]);

  /* ---------------------------------------------------------------------- */
  /* Derived                                                                */
  /* ---------------------------------------------------------------------- */

  /**
   * Grouped once per change instead of `lineItems.filter(...)` per order per
   * render, which was O(orders × items) on every keystroke and every tick.
   * Duplicate item ids are collapsed here too — realtime and the initial payload
   * can both carry the same row.
   */
  const itemsByOrder = useMemo(() => {
    const map = new Map<string, OrderItem[]>();
    const seen = new Set<string>();
    for (const item of lineItems) {
      if (item.id) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
      }
      const list = map.get(item.order_id);
      if (list) list.push(item);
      else map.set(item.order_id, [item]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    }
    return map;
  }, [lineItems]);

  return (
    <>
      <audio ref={audioRef} src="/audio/order-alert.wav" preload="auto" />

      <AdminShell
        orders={orders}
        itemsByOrder={itemsByOrder}
        riders={riders}
        stats={stats}
        loadingStats={loadingStats}
        statsNote={statsNote}
        onRefreshStats={refreshStats}
        storeMode={storeStatus.mode}
        storeIsOpen={storeStatus.isOpen}
        storeHoursText={storeStatus.operatingHoursText}
        // Time-dependent, so it stays null through the server render and the
        // first paint — the countdown is the client's business.
        forceOpenExpiresInMs={mounted ? storeStatus.forceOpenExpiresInMs : null}
        onStoreModeChange={setStoreMode}
        userEmail={userEmail}
        signOutButton={signOutButton}
        onPrint={handleOpenPrintPreview}
        onClearAll={() => setShowClearConfirm(true)}
        clearing={isClearing}
      />

      {showClearConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--color-surface-container-lowest)] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[var(--color-outline-variant)]">
            <div className="w-12 h-12 rounded-full bg-[var(--color-error)]/10 text-[var(--color-error)] flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
            <h3 className="text-xl font-extrabold text-[var(--color-on-surface)]">
              Delete All Orders?
            </h3>
            <p className="text-sm text-[var(--color-on-surface-variant)] mt-2">
              Are you sure you want to permanently delete all{" "}
              <strong>{orders.length}</strong> orders from the database? This action cannot be
              undone.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
                className="px-4 py-2 rounded-full text-xs font-bold bg-[var(--color-surface-container)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllOrders}
                disabled={isClearing}
                className="px-4 py-2 rounded-full text-xs font-bold bg-[var(--color-error)] text-white hover:brightness-110 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isClearing ? (
                  <>
                    <span className="animate-spin material-symbols-outlined text-[16px]">
                      progress_activity
                    </span>
                    Deleting...
                  </>
                ) : (
                  "Yes, Delete All"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable receipt portal — attached to body for @media print isolation */}
      {mounted &&
        printOrder &&
        createPortal(
          <div id="thermal-receipt-print-portal">
            <ThermalReceipt
              order={printOrder.order}
              items={printOrder.items}
              settings={settings}
              paperWidth={printOrder.paperWidth}
              isModalPreview={false}
            />
          </div>,
          document.body
        )}

      {showPrintModal && printOrder && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-in flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-800 text-[22px]">print</span>
                <h3 className="text-lg font-black text-slate-900">Thermal Receipt Preview</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex items-center justify-center bg-slate-100 p-1 rounded-xl mb-4 text-xs font-extrabold gap-1">
              <button
                type="button"
                onClick={() => setPrintOrder({ ...printOrder, paperWidth: "80mm" })}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  printOrder.paperWidth === "80mm"
                    ? "bg-white text-slate-900 shadow-xs font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">receipt</span>
                80mm Standard POS
              </button>
              <button
                type="button"
                onClick={() => setPrintOrder({ ...printOrder, paperWidth: "58mm" })}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  printOrder.paperWidth === "58mm"
                    ? "bg-white text-slate-900 shadow-xs font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                58mm Mini Roll
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-100 p-4 rounded-2xl border border-slate-200 mb-5 flex justify-center slim-scrollbar">
              <div
                className={`bg-white shadow-md border border-slate-300 p-2 rounded transition-all ${
                  printOrder.paperWidth === "58mm" ? "w-[58mm]" : "w-[80mm]"
                }`}
              >
                <ThermalReceipt
                  order={printOrder.order}
                  items={printOrder.items}
                  settings={settings}
                  paperWidth={printOrder.paperWidth}
                  isModalPreview={true}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleTriggerPrint(printOrder.paperWidth)}
                disabled={isPrinting}
                className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isPrinting ? (
                  <>
                    <span className="animate-spin material-symbols-outlined text-[18px]">
                      progress_activity
                    </span>
                    Printing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">print</span>
                    Print Receipt
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
