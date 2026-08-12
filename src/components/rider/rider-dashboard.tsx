"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Order, OrderItem } from "@/lib/supabase/database.types";
import { RiderOrderCard } from "./rider-order-card";
import { toast } from "sonner";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function RiderDashboard({ onLogout }: { onLogout: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [lineItems, setLineItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "completed">("active");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const supabaseRef = useRef(createBrowserClient());

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/rider/orders");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load orders");

      setOrders(data.orders || []);
      setLineItems(data.lineItems || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed loading rider orders"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialFetch = window.setTimeout(() => {
      void fetchOrders();
    }, 0);

    return () => window.clearTimeout(initialFetch);
  }, [fetchOrders]);

  // Realtime subscription for instant order updates
  useEffect(() => {
    const supabase = supabaseRef.current;

    const channel = supabase
      .channel("rider-orders-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const updated = payload.new as Order;
          setOrders((prev) => {
            const exists = prev.some((o) => o.id === updated.id);
            if (exists) {
              return prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o));
            }
            return [updated, ...prev];
          });
          
          if (updated.status === "delivering") {
            toast.info(`New delivery assigned: #${updated.order_number}`);
            audioRef.current?.play().catch(() => {});
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const newOrder = payload.new as Order;
          if (newOrder.status === "delivering") {
            setOrders((prev) => [newOrder, ...prev]);
            toast.info(`New delivery assigned: #${newOrder.order_number}`);
            audioRef.current?.play().catch(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Polling loop fallback (every 4s)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders();
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  async function handleLogout() {
    try {
      await fetch("/api/rider/logout", { method: "POST" });
      onLogout();
      toast.success("Rider logged out");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Logout failed"));
    }
  }

  const activeDeliveries = orders.filter((o) => o.status === "delivering" || o.status === "ready");
  const completedToday = orders.filter((o) => o.status === "completed");

  const displayedOrders = tab === "active" ? activeDeliveries : completedToday;

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      <audio ref={audioRef} src="/audio/order-alert.wav" preload="auto" />

      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-[#00230c] text-white border-b border-white/10 shadow-md">
        <div className="mx-auto max-w-5xl px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFC700] text-[#00230c] flex items-center justify-center font-black shadow-sm">
              <span className="material-symbols-outlined text-[24px]">two_wheeler</span>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-tight text-white">
                Rider Portal
              </h1>
              <p className="text-[11px] font-semibold text-[#FFC700]">
                Azlan Fast Food &amp; BBQ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-900/80 text-emerald-300 border border-emerald-500/30">
              {activeDeliveries.length} Active
            </span>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Logout"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mx-auto max-w-5xl px-4 pb-3 flex gap-2">
          <button
            onClick={() => setTab("active")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              tab === "active"
                ? "bg-[#FFC700] text-[#00230c] shadow-sm"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">local_shipping</span>
            Active Deliveries ({activeDeliveries.length})
          </button>
          <button
            onClick={() => setTab("completed")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              tab === "completed"
                ? "bg-[#FFC700] text-[#00230c] shadow-sm"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">task_alt</span>
            Completed ({completedToday.length})
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        {loading ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <span className="material-symbols-outlined text-[44px] text-emerald-700 animate-spin">
              progress_activity
            </span>
            <p className="mt-3 text-sm font-extrabold text-slate-700">
              Connecting to Rider Dispatch...
            </p>
          </div>
        ) : displayedOrders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-[36px]">
                {tab === "active" ? "moped" : "assignment_turned_in"}
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-900">
              {tab === "active" ? "No Active Deliveries" : "No Completed Deliveries Yet"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 font-medium">
              {tab === "active"
                ? "When the Admin marks an order as 'Out for Delivery', it will automatically appear here."
                : "Completed orders will be logged here for tracking."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {displayedOrders.map((order) => (
              <RiderOrderCard
                key={order.id}
                order={order}
                items={lineItems.filter((i) => i.order_id === order.id)}
                onStatusUpdated={fetchOrders}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
