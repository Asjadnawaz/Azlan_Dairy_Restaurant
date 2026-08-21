"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Order, OrderItem, Rider } from "@/lib/supabase/database.types";
import { toast } from "sonner";
import { RiderProfileForm } from "./rider-profile-form";
import { useRouter } from "next/navigation";
import { onAuthStateChange } from "@/lib/supabase/auth";

// Audio chime for new order assignment (Pure Web Audio API - Zero external dependencies)
function playChimeSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

function parseOrderNote(noteStr: string | null) {
  if (!noteStr) return { isCod: true, customNote: null };
  const isOnline = /\[(BANK_TRANSFER|ONLINE)\]/i.test(noteStr);
  let clean = noteStr
    .replace(/\[(PICKUP|DELIVERY)\]/gi, "")
    .replace(/\[(COD|BANK_TRANSFER|ONLINE)\]/gi, "")
    .replace(/\[(?:If unavailable|UNAVAILABLE ITEM):\s*[^\]]+\]/gi, "")
    .trim();
  return { isCod: !isOnline, customNote: clean || null };
}

function getWhatsAppUrl(phone: string, customerName: string, orderNumber: string, total: number, isCod: boolean) {
  let clean = phone.replace(/\D/g, "");
  if (clean.startsWith("0")) {
    clean = "92" + clean.substring(1);
  } else if (!clean.startsWith("92")) {
    clean = "92" + clean;
  }
  const paymentText = isCod ? `Cash to Collect: Rs. ${total}` : `(Payment Already Paid Online)`;
  const msg = `Assalam o Alaikum ${customerName}! Main Azlan Fast Food & BBQ Point se aap ka Order #${orderNumber} (${paymentText}) le kar nikal chuka hoon. Main jald aap ke address par pohnch raha hoon.`;
  return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
}

export function RiderDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItemsMap, setOrderItemsMap] = useState<Record<string, OrderItem[]>>({});
  const [rider, setRider] = useState<Rider | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "profile">("active");

  // Delivery confirmation modal state
  const [confirmDeliveryOrder, setConfirmDeliveryOrder] = useState<Order | null>(null);

  // Authentication state if not logged in
  const [authNeeded, setAuthNeeded] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const supabaseRef = useRef(createBrowserClient());
  const prevActiveCountRef = useRef<number>(0);
  const isFetchingRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchRiderAndOrders = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const res = await fetch("/api/rider/orders");
      if (!res.ok) {
        setLoading(false);
        if (res.status === 401 || res.status === 403) {
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
      setRider(data.rider as Rider);

      const newOrders = (data.orders as Order[]) || [];
      setOrders(newOrders);

      if (data.itemsMap) {
        setOrderItemsMap(data.itemsMap as Record<string, OrderItem[]>);
      }

      // Check if new order arrived for audio/vibrate notification
      const activeCount = newOrders.filter(
        (o) => o.status !== "delivered" && o.status !== "completed" && o.status !== "cancelled"
      ).length;

      if (activeCount > prevActiveCountRef.current && prevActiveCountRef.current > 0) {
        playChimeSound();
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
        toast.info("🔔 Naya Delivery Order Assign Hua Hai!", { duration: 5000 });
      }
      prevActiveCountRef.current = activeCount;
    } catch (err) {
      console.error("Error fetching rider data:", err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  const debouncedFetch = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      void fetchRiderAndOrders();
    }, 400);
  }, [fetchRiderAndOrders]);

  useEffect(() => {
    void fetchRiderAndOrders();

    const supabase = supabaseRef.current;
    const channel = supabase
      .channel("rider-orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        debouncedFetch();
      })
      .subscribe();

    const authSub = onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setAuthNeeded(true);
      } else if (event === "SIGNED_IN") {
        void fetchRiderAndOrders();
      }
    });

    return () => {
      supabase.removeChannel(channel);
      authSub.unsubscribe();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [fetchRiderAndOrders, debouncedFetch]);

  // Handle Rider Login
  const handleRiderLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const supabase = supabaseRef.current;
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
      });
      if (error) throw error;

      // Sync profile
      try {
        await fetch("/api/auth/sync-profile", { method: "POST" });
      } catch {}

      toast.success("Rider logged in successfully!");
      setAuthNeeded(false);
      setLoading(true);
      await fetchRiderAndOrders();
    } catch (err: unknown) {
      toast.error((err as Error)?.message || "Login failed. Check email and password.");
    } finally {
      setLoginLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (updatingId) return;
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update order");

      if (newStatus === "picked_up") {
        toast.success("📦 Order Picked Up from Shop!");
      } else if (newStatus === "delivering" || newStatus === "out_for_delivery") {
        toast.success("🛵 On the way to customer!");
      } else if (newStatus === "completed" || newStatus === "delivered") {
        toast.success("🎉 Order Delivered & Cash Received!");
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([150, 80, 150]);
        }
      }

      setConfirmDeliveryOrder(null);
      await fetchRiderAndOrders();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const updateRiderStatus = async (newStatus: "available" | "busy" | "offline") => {
    if (!rider) return;
    try {
      const supabase = supabaseRef.current;
      const { error } = await supabase
        .from("riders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", rider.id);
      if (error) throw error;
      setRider({ ...rider, status: newStatus });
      toast.success(`Duty status: ${newStatus.toUpperCase()}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const activeOrders = orders.filter(
    (o) => o.status !== "delivered" && o.status !== "completed" && o.status !== "cancelled"
  );
  const completedOrders = orders.filter(
    (o) => o.status === "delivered" || o.status === "completed"
  );

  // Calculate today's delivered cash summary
  const completedCashTotal = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  // Render Rider Login Screen if unauthenticated
  if (authNeeded) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-[#00230c] border-2 border-[#FFC700] text-[#FFC700] flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/50">
              <span className="material-symbols-outlined text-[36px]">two_wheeler</span>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">
              Azlan Rider Portal
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Sign in with your delivery rider credentials to view assigned orders.
            </p>
          </div>

          <form onSubmit={handleRiderLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Rider Email
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="rider@azlandairy.com"
                className="w-full h-12 px-4 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 px-4 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 rounded-xl bg-[#00230c] hover:bg-[#063814] text-[#FFC700] font-black text-sm uppercase tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loginLoading ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  <span>Sign In as Rider</span>
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-xs text-slate-400 hover:text-white font-bold transition-colors cursor-pointer"
            >
              ← Back to Customer Website
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
          <span className="font-extrabold text-base text-slate-300">Loading Rider Portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-950/40">
              <span className="material-symbols-outlined text-[24px]">two_wheeler</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-black text-white truncate leading-tight">
                {rider?.name || "Delivery Rider"}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                    rider?.status === "available"
                      ? "bg-emerald-400"
                      : rider?.status === "busy"
                      ? "bg-amber-400"
                      : "bg-slate-500"
                  }`}
                />
                <span className="text-xs text-slate-300 font-bold capitalize">
                  {rider?.status === "available" ? "Online / Ready" : rider?.status === "busy" ? "On Delivery" : "Offline"}
                </span>
              </div>
            </div>
          </div>

          {/* Duty Switch */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => updateRiderStatus("available")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                rider?.status === "available"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Online
            </button>
            <button
              onClick={() => updateRiderStatus("busy")}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                rider?.status === "busy"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Busy
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Navigation Tabs */}
        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-sm">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "active"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">local_shipping</span>
            <span>Active Orders</span>
            {activeOrders.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-white text-emerald-950 flex items-center justify-center text-[10px] font-black">
                {activeOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("completed")}
            className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "completed"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">task_alt</span>
            <span>Delivered Today ({completedOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "profile"
                ? "bg-emerald-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
            <span className="hidden sm:inline">Profile</span>
          </button>
        </div>

        {/* TAB CONTENT: PROFILE */}
        {activeTab === "profile" && (
          <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 text-slate-900 shadow-xl">
            <RiderProfileForm initialRider={rider} />
          </div>
        )}

        {/* TAB CONTENT: COMPLETED TODAY */}
        {activeTab === "completed" && (
          <div className="space-y-4">
            {/* Shift Cash Tally Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-3xl border border-slate-800 shadow-lg flex items-center justify-between">
              <div>
                <p className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
                  Today&apos;s Delivered Total
                </p>
                <h3 className="text-2xl font-black text-emerald-400 mt-1">
                  Rs. {completedCashTotal.toLocaleString()}
                </h3>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-black">
                  {completedOrders.length} Orders Completed
                </span>
              </div>
            </div>

            {completedOrders.length === 0 ? (
              <div className="bg-slate-900 p-10 rounded-3xl border border-slate-800 text-center text-slate-400 space-y-2">
                <span className="material-symbols-outlined text-[44px] text-slate-600">
                  check_circle
                </span>
                <p className="text-sm font-bold text-slate-300">No completed orders yet today.</p>
                <p className="text-xs text-slate-500">Delivered orders will show up here for your daily cash tally.</p>
              </div>
            ) : (
              completedOrders.map((order, oIdx) => (
                <div
                  key={`${order.id}-${oIdx}`}
                  className="bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-sm flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white text-sm">#{order.order_number}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-800">
                        Delivered
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{order.customer_name}</p>
                    <p className="text-[11px] text-slate-500 truncate max-w-xs">{order.customer_address}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-black text-emerald-400">Rs. {order.total}</p>
                    <p className="text-[10px] text-slate-500 font-semibold">
                      {order.completed_at ? new Date(order.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Done"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB CONTENT: ACTIVE ORDERS */}
        {activeTab === "active" && (
          <div className="space-y-4">
            {activeOrders.length === 0 ? (
              <div className="bg-slate-900 p-12 rounded-3xl border border-slate-800 text-center text-slate-400 space-y-3 shadow-lg">
                <div className="w-16 h-16 rounded-full bg-slate-800/80 text-emerald-400 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[36px]">inbox</span>
                </div>
                <h3 className="text-lg font-black text-white">No Active Deliveries</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Aap ki duty active hai. Jab admin aap ko naya order assign karega to screen par bell bajegi!
                </p>
              </div>
            ) : (
              activeOrders.map((order, orderIdx) => {
                const items = orderItemsMap[order.id] || [];
                const parsed = parseOrderNote(order.customer_note);
                const mapsUrl = order.delivery_coordinates
                  ? `https://www.google.com/maps/dir/?api=1&destination=${order.delivery_coordinates.lat},${order.delivery_coordinates.lng}`
                  : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.customer_address + ", Karachi")}`;

                const whatsappUrl = getWhatsAppUrl(
                  order.customer_phone,
                  order.customer_name,
                  order.order_number,
                  order.total,
                  parsed.isCod
                );

                const isPickedUp = order.status === "picked_up";
                const isDelivering = order.status === "delivering" || order.status === "out_for_delivery";
                const isShopStage = order.status === "ready" || order.status === "pending" || order.status === "preparing";

                return (
                  <div
                    key={`${order.id}-${orderIdx}`}
                    className="bg-slate-900 rounded-3xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-5 relative overflow-hidden"
                  >
                    {/* Header Bar */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black text-[#FFC700] tracking-tight">
                            #{order.order_number}
                          </span>
                          <span
                            className={`px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border ${
                              isShopStage
                                ? "bg-purple-950/80 text-purple-300 border-purple-800"
                                : isPickedUp
                                ? "bg-teal-950/80 text-teal-300 border-teal-800"
                                : "bg-indigo-950/80 text-indigo-300 border-indigo-800 animate-pulse"
                            }`}
                          >
                            {isShopStage ? "Ready for Pickup" : isPickedUp ? "Picked Up" : "Out for Delivery"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium mt-1">
                          Placed at: {new Date(order.placed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>

                      {/* Cash to Collect Pill */}
                      <div className="text-right">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                          {parsed.isCod ? "Cash (COD)" : "Paid Online"}
                        </span>
                        <span className="text-2xl font-black text-emerald-400">
                          Rs. {order.total}
                        </span>
                      </div>
                    </div>

                    {/* Customer Info & Quick Contact Buttons */}
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/90 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                            Customer
                          </span>
                          <h4 className="text-base font-black text-white">{order.customer_name}</h4>
                        </div>
                        <span className="text-xs font-bold text-slate-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                          {order.customer_phone}
                        </span>
                      </div>

                      {/* 2 Big Contact Buttons (Call & WhatsApp) */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <a
                          href={`tel:${order.customer_phone}`}
                          className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 text-center"
                        >
                          <span className="material-symbols-outlined text-[18px]">call</span>
                          <span>Call Customer</span>
                        </a>

                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-3 px-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 text-center"
                        >
                          <span className="material-symbols-outlined text-[18px]">chat</span>
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>

                    {/* Address & 1-Tap Google Maps Navigation */}
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/90 space-y-3">
                      <div className="flex items-start gap-2.5">
                        <span className="material-symbols-outlined text-[22px] text-blue-400 shrink-0 mt-0.5">
                          location_on
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                            Delivery Address
                          </span>
                          <p className="text-sm font-bold text-slate-100 leading-snug mt-0.5">
                            {order.customer_address}
                          </p>
                          {parsed.customNote && (
                            <p className="text-xs text-amber-300 font-bold bg-amber-950/40 p-2 rounded-lg border border-amber-800/60 mt-2">
                              Note: {parsed.customNote}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* 🗺️ Big Google Maps Button */}
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-wide transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-950/50 active:scale-[0.99] text-center cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[20px]">near_me</span>
                        <span>Open Google Maps Navigation ➔</span>
                      </a>
                    </div>

                    {/* Order Items Summary */}
                    {items.length > 0 && (
                      <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/60 space-y-2">
                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                          Items to Deliver ({items.length})
                        </span>
                        <div className="space-y-1.5">
                          {items.map((it, itIdx) => (
                            <div
                              key={`${order.id}-${it.id || it.name_snapshot}-${itIdx}`}
                              className="flex justify-between items-center text-xs text-slate-300 bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800/80"
                            >
                              <span>
                                <strong className="text-white font-black text-sm">{it.quantity}×</strong> {it.name_snapshot}
                              </span>
                              <span className="font-bold text-slate-200">Rs. {it.line_total}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 💵 BIG CASH COLLECTION ALERT BOX */}
                    <div
                      className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-3 ${
                        parsed.isCod
                          ? "bg-emerald-950/80 border-emerald-500 text-emerald-100 shadow-md"
                          : "bg-blue-950/80 border-blue-500 text-blue-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[32px] text-emerald-400">
                          {parsed.isCod ? "payments" : "verified"}
                        </span>
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wider text-emerald-300">
                            {parsed.isCod ? "CASH TO COLLECT AT DOORSTEP" : "PAYMENT STATUS"}
                          </p>
                          <p className="text-xl font-black text-white">
                            {parsed.isCod ? `Rs. ${order.total}` : "ALREADY PAID ONLINE (Collect Rs. 0)"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 🚀 1-TAP PROGRESSIVE ACTION BUTTON */}
                    <div className="pt-2">
                      {isShopStage && (
                        <button
                          type="button"
                          disabled={updatingId === order.id}
                          onClick={() => updateOrderStatus(order.id, "picked_up")}
                          className="w-full py-4 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-black text-sm uppercase tracking-wide transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50"
                        >
                          {updatingId === order.id ? (
                            <span>Updating...</span>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[22px]">takeout_dining</span>
                              <span>1-TAP: PICKED UP FROM SHOP ➔</span>
                            </>
                          )}
                        </button>
                      )}

                      {isPickedUp && (
                        <button
                          type="button"
                          disabled={updatingId === order.id}
                          onClick={() => updateOrderStatus(order.id, "delivering")}
                          className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm uppercase tracking-wide transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50"
                        >
                          {updatingId === order.id ? (
                            <span>Updating...</span>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[22px]">delivery_dining</span>
                              <span>1-TAP: ON THE WAY TO CUSTOMER ➔</span>
                            </>
                          )}
                        </button>
                      )}

                      {isDelivering && (
                        <button
                          type="button"
                          disabled={updatingId === order.id}
                          onClick={() => setConfirmDeliveryOrder(order)}
                          className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-wide transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50 shadow-emerald-950/60"
                        >
                          <span className="material-symbols-outlined text-[22px]">task_alt</span>
                          <span>✅ 1-TAP: MARK DELIVERED & CASH COLLECTED</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 🚀 DELIVERY CONFIRMATION DIALOG MODAL */}
      {/* ========================================================================= */}
      {confirmDeliveryOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-800 text-center animate-scale-in space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-600/20 text-emerald-400 border-2 border-emerald-500 flex items-center justify-center mx-auto shadow-inner">
              <span className="material-symbols-outlined text-[36px]">task_alt</span>
            </div>

            <div>
              <h3 className="text-lg font-black text-white uppercase">
                Confirm Delivery #{confirmDeliveryOrder.order_number}
              </h3>
              <p className="text-xs text-slate-300 font-medium mt-1">
                Customer: <strong>{confirmDeliveryOrder.customer_name}</strong>
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Cash Collection Reminder
              </p>
              <p className="text-2xl font-black text-emerald-400 mt-0.5">
                Rs. {confirmDeliveryOrder.total}
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeliveryOrder(null)}
                className="flex-1 py-3.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={updatingId === confirmDeliveryOrder.id}
                onClick={() => updateOrderStatus(confirmDeliveryOrder.id, "completed")}
                className="flex-1 py-3.5 rounded-xl bg-emerald-600 text-white font-black text-xs hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-950/60 cursor-pointer disabled:opacity-50"
              >
                {updatingId === confirmDeliveryOrder.id ? "Saving..." : "Yes, Delivered ✅"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
