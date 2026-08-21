import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import dynamic from "next/dynamic";
import { MENU_ITEMS } from "@/data/menu-data";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Order, OrderItem, OrderStatus, Rider } from "@/lib/supabase/database.types";
import { toast } from "sonner";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

const OrderMap = dynamic(() => import("./order-map"), {
  ssr: false,
  loading: () => <div className="w-full h-40 bg-slate-100 animate-pulse rounded-[var(--radius-lg)]"></div>
});

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; icon: string }
> = {
  pending: { label: "Pending", bg: "bg-amber-100", text: "text-amber-800", icon: "hourglass_top" },
  preparing: { label: "Preparing", bg: "bg-blue-100", text: "text-blue-800", icon: "soup_kitchen" },
  ready: { label: "Ready", bg: "bg-purple-100", text: "text-purple-800", icon: "checklist" },
  picked_up: { label: "Picked Up", bg: "bg-teal-100", text: "text-teal-800", icon: "takeout_dining" },
  out_for_delivery: { label: "Out for Delivery", bg: "bg-indigo-100", text: "text-indigo-800", icon: "delivery_dining" },
  delivering: { label: "Out for Delivery", bg: "bg-indigo-100", text: "text-indigo-800", icon: "delivery_dining" },
  delivered: { label: "Delivered", bg: "bg-emerald-100", text: "text-emerald-800", icon: "task_alt" },
  completed: { label: "Delivered", bg: "bg-emerald-100", text: "text-emerald-800", icon: "task_alt" },
  cancelled: { label: "Cancelled", bg: "bg-rose-100", text: "text-rose-800", icon: "cancel" },
};

const ADMIN_STEPS: { status: OrderStatus; label: string; icon: string }[] = [
  { status: "pending", label: "Pending", icon: "hourglass_top" },
  { status: "preparing", label: "Preparing", icon: "soup_kitchen" },
  { status: "ready", label: "Ready", icon: "checklist" },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function parseOrderNote(noteStr: string | null) {
  if (!noteStr) return { orderTypeTag: null, paymentTag: null, unavailableTag: null, customNote: null };
  let remaining = noteStr;

  let orderTypeTag: string | null = null;
  const typeMatch = remaining.match(/\[(PICKUP|DELIVERY)\]/i);
  if (typeMatch) { orderTypeTag = typeMatch[1].toUpperCase(); remaining = remaining.replace(typeMatch[0], ""); }

  let paymentTag: string | null = null;
  const payMatch = remaining.match(/\[(COD|BANK_TRANSFER|ONLINE)\]/i);
  if (payMatch) { paymentTag = payMatch[1].toUpperCase(); remaining = remaining.replace(payMatch[0], ""); }

  let unavailableTag: string | null = null;
  const unavailMatch = remaining.match(/\[(?:If unavailable|UNAVAILABLE ITEM):\s*([^\]]+)\]/i);
  if (unavailMatch) { unavailableTag = unavailMatch[1].trim(); remaining = remaining.replace(unavailMatch[0], ""); }

  return { orderTypeTag, paymentTag, unavailableTag, customNote: remaining.trim() };
}

export function OrderCard({
  order,
  items,
  onPrint,
}: {
  order: Order;
  items: OrderItem[];
  onPrint?: (order: Order, items: OrderItem[], width?: "80mm" | "58mm") => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRiderModal, setShowRiderModal] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [availableRiders, setAvailableRiders] = useState<Rider[]>([]);
  const [selectedRiderId, setSelectedRiderId] = useState<string>(order.rider_id || "");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const supabase = createBrowserClient();
    supabase.from("riders").select("*").then(({ data }) => {
      if (data) setAvailableRiders(data as Rider[]);
    });
  }, []);

  useEffect(() => {
    setSelectedRiderId(order.rider_id || "");
  }, [order.rider_id]);

  useEffect(() => {
    if (!showRiderModal && !showCancelModal) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowRiderModal(false);
        setShowCancelModal(false);
      }
    };
    window.addEventListener("keydown", handleEsc);

    return () => {
      document.body.style.overflow = orig;
      window.removeEventListener("keydown", handleEsc);
    };
  }, [showRiderModal, showCancelModal]);

  const cfg = STATUS_CONFIG[order.status];
  const parsed = parseOrderNote(order.customer_note);
  const isPickup = parsed.orderTypeTag === "PICKUP" || order.customer_address?.toLowerCase().includes("store pickup");

  const adminStepIndex = ADMIN_STEPS.findIndex((s) => s.status === order.status);
  const isInRiderTerritory = adminStepIndex === -1 && order.status !== "cancelled";

  const assignedRider = availableRiders.find(
    (r) => r.id === order.rider_id || r.user_id === order.rider_id
  );

  async function updateStatus(newStatus: OrderStatus) {
    if (updating) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Failed to update order status");
      toast.success(`Order #${order.order_number} → ${STATUS_CONFIG[newStatus].label}`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to update order status"));
    } finally {
      setUpdating(false);
    }
  }

  async function handleAssignRider(riderIdToSet: string | null) {
    if (updating) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rider_id: riderIdToSet }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Failed to assign rider");

      if (riderIdToSet) {
        const targetRider = availableRiders.find((r) => r.id === riderIdToSet);
        toast.success(`Assigned to ${targetRider?.name || "Rider"} for Order #${order.order_number}!`);
      } else {
        toast.success(`Rider unassigned from Order #${order.order_number}`);
      }
      setShowRiderModal(false);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to assign rider"));
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className={`rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden ${order.status === "pending" ? "border-amber-300 ring-1 ring-amber-300/50" : "border-slate-200"}`}>
      <div className="p-5">
        <div className="flex justify-between items-start gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-900 leading-tight">{order.customer_name}</h3>
              <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-xs font-black text-slate-800">{order.order_number}</span>
            </div>
            <a href={`tel:${order.customer_phone}`} className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 font-bold text-xs transition-colors">
              <span className="material-symbols-outlined text-[14px] text-emerald-600">call</span>
              {order.customer_phone}
            </a>
          </div>
          <div className="text-right flex flex-col items-end gap-1">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${cfg.bg} ${cfg.text} shadow-sm border border-black/5`}>
              <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
              {cfg.label}
            </span>
            <span className="text-[11px] font-semibold text-slate-500">{timeAgo(order.placed_at)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${isPickup ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-blue-50 text-blue-800 border-blue-200"}`}>
            <span className="material-symbols-outlined text-[13px]">{isPickup ? "storefront" : "local_shipping"}</span>
            {isPickup ? "Pickup" : "Delivery"}
          </span>
          {parsed.paymentTag === "BANK_TRANSFER" ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300">
              <span className="material-symbols-outlined text-[13px] text-emerald-600">account_balance_wallet</span>
              Bank Transfer
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-amber-100 text-amber-950 border border-amber-300">
              <span className="material-symbols-outlined text-[13px] text-amber-700">payments</span>
              COD: Rs. {order.total}
            </span>
          )}
          {parsed.unavailableTag && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
              <span className="material-symbols-outlined text-[13px]">error</span>
              {parsed.unavailableTag}
            </span>
          )}
        </div>

        {parsed.customNote && (
          <div className="mb-4 flex items-start gap-2 text-xs text-slate-800 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80">
            <span className="material-symbols-outlined text-[16px] text-amber-700 shrink-0 mt-0.5">sticky_note_2</span>
            <span className="italic font-bold">{parsed.customNote}</span>
          </div>
        )}

        {!isPickup && (
          <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-0.5">Address</p>
                <p className="text-sm font-bold text-slate-900 leading-snug">{order.customer_address}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-0.5">Distance</p>
                <p className="text-sm font-black text-emerald-800">
                  {calculatedDistance !== null ? `${calculatedDistance.toFixed(1)} km` : order.delivery_distance_km ? `${order.delivery_distance_km.toFixed(1)} km` : "N/A"}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => setIsMapExpanded(!isMapExpanded)} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-[15px] text-blue-600">{isMapExpanded ? "map" : "pin_drop"}</span>
              {isMapExpanded ? "Hide Map" : "Show Map"}
              <span className="material-symbols-outlined text-[15px]">{isMapExpanded ? "expand_less" : "expand_more"}</span>
            </button>
            {isMapExpanded && (
              <div className="rounded-xl overflow-hidden border border-slate-200 animate-fade-in">
                {order.delivery_coordinates ? (
                  <OrderMap deliveryLat={order.delivery_coordinates.lat} deliveryLng={order.delivery_coordinates.lng} onRouteCalculated={(info) => setCalculatedDistance(info.distanceKm)} />
                ) : (
                  <div className="w-full h-36 bg-slate-100 flex items-center justify-center flex-col text-slate-500">
                    <span className="material-symbols-outlined text-[28px] mb-1">location_off</span>
                    <span className="text-xs font-bold">No coordinates</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mb-4">
          <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
            Items <span className="bg-slate-200 text-slate-800 py-0.5 px-1.5 rounded-full text-[10px] font-black">{items.length}</span>
          </h4>
          {items.length > 0 ? (
            <div className="space-y-1.5">
              {items.map((item, idx) => {
                const menuItem = MENU_ITEMS.find(m => m.name === item.name_snapshot);
                return (
                  <div key={`${order.id}-${item.id || item.name_snapshot}-${idx}`} className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 bg-slate-50/50">
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white border border-slate-200">
                      {menuItem?.image_path ? (
                        <Image src={menuItem.image_path} alt={item.name_snapshot} fill sizes="40px" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                          <span className="material-symbols-outlined text-[18px]">restaurant</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 truncate">{item.name_snapshot}</h4>
                      <span className="text-[11px] text-slate-500 font-medium">{item.quantity}× @ Rs. {item.price_snapshot}</span>
                    </div>
                    <span className="font-black text-sm text-emerald-900 shrink-0">Rs. {item.line_total}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 border-dashed text-xs text-amber-900 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-amber-600">warning</span>
              <span className="font-bold">No items recorded.</span>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-200">
          <div className="flex justify-between items-center text-xs text-slate-600 font-bold mb-0.5">
            <span>Subtotal</span>
            <span className="font-extrabold text-slate-800">Rs. {order.subtotal}</span>
          </div>
          {!isPickup && (
            <div className="flex justify-between items-center text-xs text-slate-600 font-bold mb-1">
              <span>Delivery Fee</span>
              <span className="font-extrabold text-slate-800">Rs. {order.delivery_fee}</span>
            </div>
          )}
          <div className="flex justify-between items-end mt-1.5">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Total</span>
            <span className="text-xl font-black text-[#00230c]">Rs. {order.total}</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200">
          <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
            <span>Kitchen & Delivery Progress</span>
            <span className="text-xs font-black text-slate-800">{cfg.label}</span>
          </div>

          {order.status === "cancelled" ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-rose-600">cancel</span>
              <span>This order was cancelled.</span>
            </div>
          ) : isInRiderTerritory ? (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-indigo-600">delivery_dining</span>
                <span>With Rider — {cfg.label}</span>
              </div>
              {assignedRider && (
                <span className="text-[11px] bg-indigo-200 text-indigo-900 font-extrabold px-2 py-0.5 rounded-md">
                  {assignedRider.name}
                </span>
              )}
            </div>
          ) : (
            <div className="relative pt-1 pb-2">
              <div className="absolute top-4 left-3 right-3 h-1 bg-slate-200 z-0 rounded-full" />
              <div
                className="absolute top-4 left-3 h-1 bg-emerald-600 z-0 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(0, (adminStepIndex / (ADMIN_STEPS.length - 1)) * 100)}%` }}
              />
              <div className="relative z-10 flex justify-between items-center">
                {ADMIN_STEPS.map((step, idx) => {
                  const isPassed = idx < adminStepIndex;
                  const isCurrent = idx === adminStepIndex;
                  return (
                    <button
                      key={step.status}
                      type="button"
                      onClick={() => updateStatus(step.status)}
                      disabled={updating}
                      title={`Set to ${step.label}`}
                      className="flex flex-col items-center group cursor-pointer"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${isPassed ? "bg-emerald-600 text-white" : isCurrent ? "bg-[#00230c] text-[#FFC700] ring-4 ring-emerald-200 scale-110" : "bg-slate-200 text-slate-500 group-hover:bg-slate-300"}`}>
                        <span className="material-symbols-outlined text-[15px]">{isPassed ? "check" : step.icon}</span>
                      </div>
                      <span className={`mt-1 text-[11px] font-bold transition-colors ${isCurrent ? "text-slate-900 font-black" : isPassed ? "text-emerald-700" : "text-slate-400"}`}>
                        {step.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-100 mt-2">
          {!isPickup && order.status !== "completed" && order.status !== "cancelled" && order.status !== "delivered" && (
            <div>
              {order.rider_id ? (
                <div className="p-2.5 rounded-xl bg-indigo-50/90 border border-indigo-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <span className="material-symbols-outlined text-[18px]">two_wheeler</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-extrabold uppercase text-indigo-700">Assigned Rider</span>
                        {assignedRider?.status && (
                          <span className={`w-1.5 h-1.5 rounded-full ${assignedRider.status === "available" ? "bg-emerald-500" : "bg-amber-500"}`} />
                        )}
                      </div>
                      <p className="text-xs font-black text-slate-900 truncate">
                        {assignedRider?.name || "Rider Assigned"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRiderModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center gap-1 shrink-0 shadow-xs cursor-pointer active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                    Change
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowRiderModal(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 hover:from-indigo-100 hover:to-purple-100 border border-indigo-200/90 text-indigo-950 font-extrabold text-xs transition-all flex items-center justify-between shadow-xs group cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                      <span className="material-symbols-outlined text-[16px]">two_wheeler</span>
                    </div>
                    <span>Assign Delivery Rider</span>
                  </div>
                  <span className="inline-flex items-center gap-0.5 text-indigo-700 font-bold text-[11px] group-hover:translate-x-0.5 transition-transform">
                    Select
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </span>
                </button>
              )}
            </div>
          )}

          {!isInRiderTerritory && order.status !== "completed" && order.status !== "cancelled" && order.status !== "delivered" && (
            <div className="flex gap-2">
              {adminStepIndex >= 0 && adminStepIndex < ADMIN_STEPS.length - 1 && (
                <button
                  type="button"
                  onClick={() => updateStatus(ADMIN_STEPS[adminStepIndex + 1].status)}
                  disabled={updating}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-700 text-white font-extrabold text-xs hover:bg-emerald-800 transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer active:scale-[0.99]"
                >
                  <span className="material-symbols-outlined text-[16px]">{ADMIN_STEPS[adminStepIndex + 1].icon}</span>
                  {ADMIN_STEPS[adminStepIndex + 1].label} ➔
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                disabled={updating}
                className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 font-extrabold text-xs hover:bg-rose-100 border border-rose-200 transition-colors flex items-center justify-center gap-1 shrink-0 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">cancel</span>
                Cancel
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => onPrint?.(order, items)}
            className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            Print Receipt
          </button>
        </div>
      </div>

      {showRiderModal && mounted && createPortal(
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowRiderModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="assign-rider-title"
        >
          <div
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-[#00230c] via-[#093816] to-[#00230c] text-white p-5 flex items-start justify-between border-b border-emerald-900/40">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-[#FFC700] text-slate-950 flex items-center justify-center font-black">
                    <span className="material-symbols-outlined text-[18px]">two_wheeler</span>
                  </span>
                  <div>
                    <h3 id="assign-rider-title" className="text-base font-black uppercase tracking-tight text-white">
                      Assign Delivery Rider
                    </h3>
                    <p className="text-xs text-emerald-200/90 font-semibold">
                      Order #{order.order_number} • Rs. {order.total}
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRiderModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close rider dialog"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-start gap-2.5 text-xs text-slate-700">
              <span className="material-symbols-outlined text-[18px] text-emerald-700 shrink-0 mt-0.5">
                location_on
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="font-extrabold text-slate-900 truncate">{order.customer_name}</span>
                  <a
                    href={`tel:${order.customer_phone}`}
                    className="text-emerald-700 font-bold hover:underline shrink-0 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[13px]">call</span>
                    {order.customer_phone}
                  </a>
                </div>
                <p className="text-[11px] text-slate-600 font-medium leading-tight">
                  {order.customer_address}
                </p>
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5 flex-1 slim-scrollbar">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                <span>Available Riders</span>
                <span className="text-[11px] lowercase font-semibold bg-slate-100 px-2 py-0.5 rounded-full">
                  {availableRiders.length} registered
                </span>
              </div>

              {availableRiders.length === 0 ? (
                <div className="py-8 px-4 text-center rounded-2xl bg-slate-50 border border-slate-200 border-dashed space-y-2">
                  <span className="material-symbols-outlined text-[36px] text-slate-400">
                    no_crash
                  </span>
                  <p className="text-sm font-extrabold text-slate-800">No Riders Registered</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    No riders found in database. Create or approve rider accounts in Supabase to dispatch orders.
                  </p>
                </div>
              ) : (
                availableRiders.map((r, rIdx) => {
                  const isSelected = selectedRiderId === r.id;
                  const isCurrentlyAssigned = order.rider_id === r.id;
                  const statusColor =
                    r.status === "available"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : r.status === "busy"
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : "bg-slate-100 text-slate-600 border-slate-300";

                  return (
                    <div
                      key={`${order.id}-rider-${r.id}-${rIdx}`}
                      onClick={() => setSelectedRiderId(r.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-600/30"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                            isSelected
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && (
                            <span className="material-symbols-outlined text-[14px] font-black">
                              check
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm text-slate-900 truncate">{r.name}</h4>
                            {isCurrentlyAssigned && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-200 shrink-0">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px] text-slate-400">call</span>
                              {r.phone}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide border shrink-0 ${statusColor}`}>
                        {r.status || "active"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2.5">
              <div>
                {order.rider_id && (
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => handleAssignRider(null)}
                    className="px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs transition-colors cursor-pointer"
                  >
                    Unassign
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRiderModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!selectedRiderId || updating}
                  onClick={() => handleAssignRider(selectedRiderId)}
                  className="px-5 py-2.5 rounded-xl bg-[#00230c] hover:bg-[#083d16] text-[#FFC700] font-black text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                >
                  {updating ? (
                    <span>Assigning...</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">send</span>
                      <span>Confirm & Dispatch</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showCancelModal && mounted && createPortal(
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowCancelModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <span className="material-symbols-outlined text-[32px]">warning</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase">Cancel Order #{order.order_number}?</h3>
            <p className="text-xs text-slate-600 font-medium mt-1">
              Cancel the order for <strong>{order.customer_name}</strong>? This cannot be easily reverted.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
              >
                No, Keep Order
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false);
                  updateStatus("cancelled");
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-extrabold text-xs hover:bg-rose-700 transition-colors shadow-md cursor-pointer"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
