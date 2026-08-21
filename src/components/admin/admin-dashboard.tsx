"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Order, OrderItem, Settings, OrderStatus } from "@/lib/supabase/database.types";
import { OrderCard } from "./order-card";
import { StoreToggle } from "./store-toggle";
import { PriceManager } from "./price-manager";
import { ThermalReceipt } from "./thermal-receipt";
import { toast } from "sonner";

interface AdminDashboardProps {
  initialOrders: Order[];
  initialLineItems: OrderItem[];
  settings: Settings | null;
  userEmail: string;
  signOutButton: React.ReactNode;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function AdminDashboard({
  initialOrders,
  initialLineItems,
  settings,
  userEmail,
  signOutButton,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"orders" | "prices">("orders");
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [lineItems, setLineItems] = useState<OrderItem[]>(initialLineItems);
  const [isActive, setIsActive] = useState(settings?.is_active ?? true);
  const [filter, setFilter] = useState<OrderStatus | "all" | "with_rider" | "delivered">("all");
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [printOrder, setPrintOrder] = useState<{
    order: Order;
    items: OrderItem[];
    paperWidth: "80mm" | "58mm";
  } | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const supabaseRef = useRef(createBrowserClient());

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOpenPrintPreview = (
    orderToPrint: Order,
    itemsToPrint: OrderItem[],
    paperWidth: "80mm" | "58mm" = "80mm"
  ) => {
    setPrintOrder({ order: orderToPrint, items: itemsToPrint, paperWidth });
    setShowPrintModal(true);
  };

  const handleTriggerPrint = (width?: "80mm" | "58mm") => {
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
  };

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

  async function handleClearAllOrders() {
    if (isClearing) return;
    setIsClearing(true);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to clear orders");
      }
      setOrders([]);
      setLineItems([]);
      setShowClearConfirm(false);
      toast.success("All orders cleared successfully!");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to clear orders"));
    } finally {
      setIsClearing(false);
    }
  }

  // Play alert sound
  const playAlert = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch((err) => {
      console.warn("Audio playback blocked:", err);
    });
  }, []);

  // Realtime subscriptions
  useEffect(() => {
    const supabase = supabaseRef.current;

    // Listen for new orders (INSERT)
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
        }
      )
      .subscribe();

    // Listen for new line items
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

    // Listen for settings changes (store toggle)
    const settingsChannel = supabase
      .channel("admin-settings")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "settings" },
        (payload) => {
          const updated = payload.new as Settings;
          setIsActive(updated.is_active);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(itemChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, [playAlert]);



  const fetchedOrderIdsRef = useRef<Set<string>>(new Set());

  // Fetch line items for a new order
  const fetchLineItems = useCallback(async (orderId: string) => {
    if (fetchedOrderIdsRef.current.has(orderId)) return;
    fetchedOrderIdsRef.current.add(orderId);

    const supabase = supabaseRef.current;
    const { data } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);
    if (data && data.length > 0) {
      setLineItems((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        const fresh = (data as OrderItem[]).filter((i) => !existingIds.has(i.id));
        return [...prev, ...fresh];
      });
    }
  }, []);

  useEffect(() => {
    orders.forEach((order) => {
      const hasItems = lineItems.some((i) => i.order_id === order.id);
      if (!hasItems) {
        fetchLineItems(order.id);
      }
    });
  }, [orders, lineItems, fetchLineItems]);

  const RIDER_STATUSES: OrderStatus[] = ["picked_up", "out_for_delivery", "delivering"];
  const DONE_STATUSES: OrderStatus[] = ["delivered", "completed"];

  const filtered = filter === "all"
    ? orders
    : filter === "with_rider"
    ? orders.filter((o) => RIDER_STATUSES.includes(o.status))
    : filter === "delivered"
    ? orders.filter((o) => DONE_STATUSES.includes(o.status))
    : orders.filter((o) => o.status === filter);

  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    preparing: orders.filter((o) => o.status === "preparing").length,
    ready: orders.filter((o) => o.status === "ready").length,
    with_rider: orders.filter((o) => RIDER_STATUSES.includes(o.status)).length,
    delivered: orders.filter((o) => DONE_STATUSES.includes(o.status)).length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <audio ref={audioRef} src="/audio/order-alert.wav" preload="auto" />

      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-[var(--color-surface-container-lowest)] border-b border-[var(--color-outline-variant)] custom-shadow">
        <div className="mx-auto max-w-7xl px-4 md:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 md:gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <Link href="/" className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)]">
                <span className="material-symbols-outlined">arrow_back</span>
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold text-[var(--color-primary)] leading-tight whitespace-nowrap">
                  Admin Dashboard
                </h1>
                <p className="text-xs text-[var(--color-on-surface-variant)] whitespace-nowrap">
                  Azlan Fast Food Control Center
                </p>
              </div>
            </div>

            {/* Navigation Tabs - Stacked vertically on mobile, horizontal on desktop */}
            <div className="flex flex-col sm:flex-row bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab("orders")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 w-full sm:w-auto ${
                  activeTab === "orders"
                    ? "bg-white text-[var(--color-primary)] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                Orders ({orders.length})
              </button>
              <button
                onClick={() => setActiveTab("prices")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 w-full sm:w-auto ${
                  activeTab === "prices"
                    ? "bg-white text-[var(--color-primary)] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">sell</span>
                Price Manager
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <StoreToggle isActive={isActive} onToggle={setIsActive} />

            {/* Clear Orders Button */}
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={orders.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all border border-[var(--color-error)]/30 text-[var(--color-error)] hover:bg-[var(--color-error)]/10 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Delete all orders"
            >
              <span className="material-symbols-outlined text-[16px]">
                delete_sweep
              </span>
              <span className="hidden md:inline">Clear Orders</span>
            </button>

            {/* User badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full bg-[var(--color-surface-container)]">
              <span className="w-7 h-7 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-bold uppercase">
                {userEmail.charAt(0)}
              </span>
              <span className="text-xs font-medium text-[var(--color-on-surface-variant)] max-w-[120px] truncate">
                {userEmail}
              </span>
            </div>

            {/* Sign out */}
            {signOutButton}
          </div>
        </div>
      </header>

      {/* Confirmation Modal for Clearing Orders */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--color-surface-container-lowest)] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[var(--color-outline-variant)]">
            <div className="w-12 h-12 rounded-full bg-[var(--color-error)]/10 text-[var(--color-error)] flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-2xl">
                warning
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-[var(--color-on-surface)]">
              Delete All Orders?
            </h3>
            <p className="text-sm text-[var(--color-on-surface-variant)] mt-2">
              Are you sure you want to permanently delete all <strong>{orders.length}</strong> orders from the database? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
                className="px-4 py-2 rounded-full text-xs font-bold bg-[var(--color-surface-container)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllOrders}
                disabled={isClearing}
                className="px-4 py-2 rounded-full text-xs font-bold bg-[var(--color-error)] text-white hover:brightness-110 disabled:opacity-50 flex items-center gap-2"
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

      {/* View Switcher: Orders vs Price Manager */}
      {activeTab === "prices" ? (
        <div className="mx-auto max-w-7xl px-4 md:px-8 py-8">
          <PriceManager />
        </div>
      ) : (
        <>
          {/* Stats bar */}
          <div className="mx-auto max-w-7xl px-4 md:px-8 py-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {([
              { key: "all", label: "All", color: "var(--color-primary)" },
              { key: "pending", label: "Pending", color: "#f59e0b" },
              { key: "preparing", label: "Preparing", color: "#3b82f6" },
              { key: "ready", label: "Ready", color: "#8b5cf6" },
              { key: "with_rider", label: "With Rider", color: "#0ea5e9" },
              { key: "delivered", label: "Delivered", color: "var(--color-success)" },
              { key: "cancelled", label: "Cancelled", color: "var(--color-error)" },
            ] as const).map((stat) => (
              <button
                key={stat.key}
                onClick={() => setFilter(stat.key)}
                className={`p-3 rounded-[var(--radius-lg)] border text-left transition-all
                  ${filter === stat.key
                    ? "border-[var(--color-primary)] bg-[var(--color-surface-container-low)] custom-shadow"
                    : "border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] hover:border-[var(--color-primary)]/30"}`}
              >
                <p className="text-2xl font-extrabold" style={{ color: stat.color }}>
                  {counts[stat.key]}
                </p>
                <p className="text-xs font-medium text-[var(--color-on-surface-variant)]">
                  {stat.label}
                </p>
              </button>
            ))}
          </div>

          {/* Orders list */}
          <div className="mx-auto max-w-7xl px-4 md:px-8 pb-16">
            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <span className="material-symbols-outlined text-[80px] text-[var(--color-on-surface-variant)]/30">
                  inbox
                </span>
                <p className="mt-4 font-semibold text-[var(--color-on-surface-variant)]">
                  No orders {filter !== "all" && `in "${filter}"`}
                </p>
                <p className="text-sm text-[var(--color-on-surface-variant)]/70 mt-1">
                  New orders will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((order) => {
                  const orderItems = lineItems.filter((i) => i.order_id === order.id);
                  const uniqueOrderItems = Array.from(
                    new Map(orderItems.map((item) => [item.id, item])).values()
                  );
                  return (
                    <OrderCard
                      key={order.id}
                      order={order}
                      items={uniqueOrderItems}
                      onPrint={(orderToPrint, itemsToPrint, width) =>
                        handleOpenPrintPreview(orderToPrint, itemsToPrint, width ?? "80mm")
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Printable Thermal Receipt Portal (attached directly to body for @media print isolation) */}
      {mounted && printOrder && createPortal(
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

      {/* Thermal Receipt Preview & Print Modal */}
      {showPrintModal && printOrder && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-in flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-800 text-[22px]">
                  print
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Thermal Receipt Preview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Paper Dimension Switcher */}
            <div className="flex items-center justify-center bg-slate-100 p-1 rounded-xl mb-4 text-xs font-extrabold gap-1">
              <button
                type="button"
                onClick={() => setPrintOrder({ ...printOrder, paperWidth: "80mm" })}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  printOrder.paperWidth === "80mm"
                    ? "bg-white text-slate-900 shadow-xs font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  receipt
                </span>
                80mm Standard POS
              </button>
              <button
                type="button"
                onClick={() => setPrintOrder({ ...printOrder, paperWidth: "58mm" })}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  printOrder.paperWidth === "58mm"
                    ? "bg-white text-slate-900 shadow-xs font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  receipt_long
                </span>
                58mm Mini Roll
              </button>
            </div>

            {/* Interactive Thermal Receipt Visual Preview Box */}
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

            {/* Modal Action Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleTriggerPrint(printOrder.paperWidth)}
                disabled={isPrinting}
                className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
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
                    <span className="material-symbols-outlined text-[18px]">
                      print
                    </span>
                    Print Receipt
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
