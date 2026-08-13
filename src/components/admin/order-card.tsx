import { useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { MENU_ITEMS } from "@/data/menu-data";
import type { Order, OrderItem, OrderStatus } from "@/lib/supabase/database.types";
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
  pending: {
    label: "Pending",
    bg: "bg-amber-100",
    text: "text-amber-800",
    icon: "hourglass_top",
  },
  preparing: {
    label: "Preparing",
    bg: "bg-blue-100",
    text: "text-blue-800",
    icon: "soup_kitchen",
  },
  ready: {
    label: "Ready",
    bg: "bg-purple-100",
    text: "text-purple-800",
    icon: "checklist",
  },
  delivering: {
    label: "Out for Delivery",
    bg: "bg-indigo-100",
    text: "text-indigo-800",
    icon: "delivery_dining",
  },
  completed: {
    label: "Delivered",
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    icon: "task_alt",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-rose-100",
    text: "text-rose-800",
    icon: "cancel",
  },
};

const LIFECYCLE_STEPS: { status: OrderStatus; label: string; icon: string }[] = [
  { status: "pending", label: "Pending", icon: "hourglass_top" },
  { status: "preparing", label: "Preparing", icon: "soup_kitchen" },
  { status: "ready", label: "Ready", icon: "checklist" },
  { status: "delivering", label: "Out for Delivery", icon: "delivery_dining" },
  { status: "completed", label: "Delivered", icon: "task_alt" },
];



function getOrderAgeBadge(placedAt: string) {
  const diffMins = Math.floor((Date.now() - new Date(placedAt).getTime()) / 60000);
  if (diffMins < 10) {
    return {
      label: `${diffMins}m old`,
      bg: "bg-emerald-100 text-emerald-800 border-emerald-300",
      icon: "timer",
      isUrgent: false,
    };
  } else if (diffMins < 30) {
    return {
      label: `${diffMins}m old`,
      bg: "bg-amber-100 text-amber-900 border-amber-300",
      icon: "schedule",
      isUrgent: false,
    };
  } else {
    return {
      label: `${diffMins}m old`,
      bg: "bg-rose-100 text-rose-900 border-rose-300 font-extrabold",
      icon: "warning",
      isUrgent: false,
    };
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatExactTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

function parseOrderNote(noteStr: string | null) {
  if (!noteStr)
    return {
      orderTypeTag: null,
      paymentTag: null,
      unavailableTag: null,
      customNote: null,
    };

  let remaining = noteStr;

  let orderTypeTag: string | null = null;
  const typeMatch = remaining.match(/\[(PICKUP|DELIVERY)\]/i);
  if (typeMatch) {
    orderTypeTag = typeMatch[1].toUpperCase();
    remaining = remaining.replace(typeMatch[0], "");
  }

  let paymentTag: string | null = null;
  const payMatch = remaining.match(/\[(COD|BANK_TRANSFER|ONLINE)\]/i);
  if (payMatch) {
    paymentTag = payMatch[1].toUpperCase();
    remaining = remaining.replace(payMatch[0], "");
  }

  let unavailableTag: string | null = null;
  const unavailMatch = remaining.match(
    /\[(?:If unavailable|UNAVAILABLE ITEM):\s*([^\]]+)\]/i
  );
  if (unavailMatch) {
    unavailableTag = unavailMatch[1].trim();
    remaining = remaining.replace(unavailMatch[0], "");
  }

  const customNote = remaining.trim();

  return { orderTypeTag, paymentTag, unavailableTag, customNote };
}

export function OrderCard({
  order,
  items,
}: {
  order: Order;
  items: OrderItem[];
}) {
  const [updating, setUpdating] = useState(false);
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);


  const cfg = STATUS_CONFIG[order.status];
  const ageBadge = getOrderAgeBadge(order.placed_at);
  const parsed = parseOrderNote(order.customer_note);
  const isPickup =
    parsed.orderTypeTag === "PICKUP" ||
    order.customer_address?.toLowerCase().includes("store pickup");

  const currentStepIndex = LIFECYCLE_STEPS.findIndex((s) => s.status === order.status);

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

      if (!res.ok) {
        throw new Error(data.error || "Failed to update order status");
      }

      toast.success(
        `Order #${order.order_number} → ${STATUS_CONFIG[newStatus].label}`
      );
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to update order status"));
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow
        overflow-hidden ${order.status === "pending" ? "border-amber-300 ring-1 ring-amber-300/50" : "border-slate-200"}`}
    >
      <div className="p-5">
        {/* Top Header: Order ID + Age Badge + Status */}
        <div className="flex justify-between items-start gap-2 mb-4">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                {order.customer_name}
              </h3>
              {/* Order ID Quick Copy */}
              <div className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                <span className="text-xs font-black text-slate-800">
                  {order.order_number}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(order.order_number);
                    toast.success(`Copied ${order.order_number} to clipboard!`);
                  }}
                  className="p-0.5 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-colors"
                  title="Copy Order ID"
                >
                  <span className="material-symbols-outlined text-[13px]">content_copy</span>
                </button>
              </div>
            </div>

            {/* Clickable Phone Number Link */}
            <div className="mt-1.5">
              <a
                href={`tel:${order.customer_phone}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 font-extrabold text-xs transition-colors shadow-xs"
                title="Click to dial customer"
              >
                <span className="material-symbols-outlined text-[16px] text-emerald-600">call</span>
                <span>{order.customer_phone}</span>
              </a>
            </div>
          </div>

          <div className="text-right flex flex-col items-end gap-1.5">
            {/* Current Status Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${cfg.bg} ${cfg.text} shadow-sm border border-black/5`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {cfg.icon}
              </span>
              {cfg.label}
            </span>

            {/* Dynamic Aging Indicator Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-bold ${ageBadge.bg}`}
              title={`Placed ${formatExactTime(order.placed_at)}`}
            >
              <span className="material-symbols-outlined text-[13px]">
                {ageBadge.icon}
              </span>
              {ageBadge.label}
            </span>

            {/* Relative & Precise Timestamp */}
            <span
              className="text-[11px] font-semibold text-slate-600 cursor-help underline decoration-dotted decoration-slate-300"
              title={`Exact time: ${formatExactTime(order.placed_at)}`}
            >
              {timeAgo(order.placed_at)}
            </span>
          </div>
        </div>

        {/* Badges / Order Meta & COD Payment Clarification Tag */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {isPickup ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/70">
              <span className="material-symbols-outlined text-[14px]">storefront</span>
              Pickup
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200/70">
              <span className="material-symbols-outlined text-[14px]">local_shipping</span>
              Delivery
            </span>
          )}

          {/* COD Payment Clarification Tag */}
          {parsed.paymentTag === "BANK_TRANSFER" ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-xs">
              <span className="material-symbols-outlined text-[14px] text-emerald-600">account_balance_wallet</span>
              Paid via Bank Transfer
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-extrabold bg-amber-100 text-amber-950 border border-amber-300 shadow-xs">
              <span className="material-symbols-outlined text-[15px] text-amber-700">payments</span>
              Cash to Collect: Rs. {order.total}
            </span>
          )}

          {parsed.unavailableTag && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200/70">
              <span className="material-symbols-outlined text-[14px]">error</span>
              If unavailable: {parsed.unavailableTag}
            </span>
          )}
        </div>

        {/* Custom Note */}
        {parsed.customNote && (
          <div className="mb-5 flex items-start gap-2 text-sm text-slate-800 bg-amber-50/70 p-3 rounded-xl border border-amber-200/80">
            <span className="material-symbols-outlined text-[18px] text-amber-700 shrink-0 mt-0.5">
              sticky_note_2
            </span>
            <span className="italic font-bold">{parsed.customNote}</span>
          </div>
        )}



        {/* Collapsible Delivery Address & Map Integration */}
        {!isPickup && (
          <div className="mb-6 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 mb-0.5">
                  Delivery Address (WCAG Contrast Enhanced)
                </p>
                {/* High Contrast Dark Address Text */}
                <p className="text-sm font-bold text-slate-900 leading-snug">
                  {order.customer_address}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 mb-0.5">Distance</p>
                <p className="text-sm font-black text-emerald-800">
                  {calculatedDistance !== null
                    ? `${calculatedDistance.toFixed(1)} km`
                    : order.delivery_distance_km
                    ? `${order.delivery_distance_km.toFixed(1)} km`
                    : "N/A"}
                </p>
              </div>
            </div>

            {/* Collapsible Map Toggle */}
            <div className="pt-2 border-t border-slate-200/80">
              <button
                type="button"
                onClick={() => setIsMapExpanded(!isMapExpanded)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px] text-blue-600">
                  {isMapExpanded ? "map" : "pin_drop"}
                </span>
                <span>{isMapExpanded ? "Hide Map View" : "Show Map View"}</span>
                <span className="material-symbols-outlined text-[16px]">
                  {isMapExpanded ? "expand_less" : "expand_more"}
                </span>
              </button>

              {/* Render Map only when expanded */}
              {isMapExpanded && (
                <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 animate-fade-in">
                  {order.delivery_coordinates ? (
                    <OrderMap
                      deliveryLat={order.delivery_coordinates.lat}
                      deliveryLng={order.delivery_coordinates.lng}
                      onRouteCalculated={(info) => setCalculatedDistance(info.distanceKm)}
                    />
                  ) : (
                    <div className="w-full h-36 bg-slate-100 flex items-center justify-center flex-col text-slate-500">
                      <span className="material-symbols-outlined text-[28px] mb-1">location_off</span>
                      <span className="text-xs font-bold">No map coordinates available</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="mb-6">
          <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-2">
            Order Items
            <span className="bg-slate-200 text-slate-800 py-0.5 px-2 rounded-full text-[10px] font-black">{items.length}</span>
          </h4>
          
          {items.length > 0 ? (
            <div className="space-y-2">
              {items.map((item) => {
                const menuItem = MENU_ITEMS.find(m => m.name === item.name_snapshot);
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-white border border-slate-200 shadow-xs">
                      {menuItem?.image_path ? (
                        <Image
                          src={menuItem.image_path}
                          alt={item.name_snapshot}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                          <span className="material-symbols-outlined text-[20px]">restaurant</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-sm text-slate-900 truncate">
                        {item.name_snapshot}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                         <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-black bg-[#00230c] text-[#FFC700]">
                           {item.quantity}×
                         </span>
                         <span className="text-xs font-semibold text-slate-600">
                           @ Rs. {item.price_snapshot}
                         </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <p className="font-black text-sm text-emerald-900">
                        Rs. {item.line_total}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 border-dashed text-xs text-amber-900 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-amber-600">
                warning
              </span>
              <span className="font-bold">No line items recorded for this order.</span>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="pt-4 border-t border-slate-200">
          <div className="flex justify-between items-center mb-1 text-xs text-slate-600 font-bold">
             <span>Subtotal</span>
             <span className="font-extrabold text-slate-800">Rs. {order.subtotal}</span>
          </div>
          {!isPickup && (
             <div className="flex justify-between items-center mb-2 text-xs text-slate-600 font-bold">
               <span>Delivery Fee</span>
               <span className="font-extrabold text-slate-800">Rs. {order.delivery_fee}</span>
             </div>
          )}
          <div className="flex justify-between items-end mt-2">
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-widest">
              Total Amount
            </span>
            <span className="font-black text-2xl text-emerald-800 leading-none">
              Rs. {order.total}
            </span>
          </div>
        </div>
      </div>

      {/* Horizontal Order Status Lifecycle Stepper */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
        <p className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
          Order Lifecycle Stepper
        </p>

        {order.status === "cancelled" ? (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-rose-600">cancel</span>
              Order is Cancelled
            </span>
            <button
              type="button"
              onClick={() => updateStatus("pending")}
              disabled={updating}
              className="px-2.5 py-1 rounded bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-700"
            >
              Re-open Order
            </button>
          </div>
        ) : (
          <div className="relative pt-1 pb-2">
            {/* Stepper Progress Line */}
            <div className="absolute top-4 left-3 right-3 h-1 bg-slate-200 z-0 rounded-full" />
            <div
              className="absolute top-4 left-3 h-1 bg-emerald-600 z-0 rounded-full transition-all duration-300"
              style={{
                width: `${Math.max(0, (currentStepIndex / (LIFECYCLE_STEPS.length - 1)) * 100)}%`,
              }}
            />

            {/* Stepper Circles */}
            <div className="relative z-10 flex justify-between items-center">
              {LIFECYCLE_STEPS.map((step, idx) => {
                const isPassed = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const isFuture = idx > currentStepIndex;

                return (
                  <button
                    key={step.status}
                    type="button"
                    onClick={() => updateStatus(step.status)}
                    disabled={updating}
                    title={`Click to set status to ${step.label}`}
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                        isPassed
                          ? "bg-emerald-600 text-white"
                          : isCurrent
                          ? "bg-[#00230c] text-[#FFC700] ring-4 ring-emerald-200 scale-110"
                          : "bg-slate-200 text-slate-500 group-hover:bg-slate-300"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {isPassed ? "check" : step.icon}
                      </span>
                    </div>
                    <span
                      className={`mt-1 text-[10px] font-bold transition-colors ${
                        isCurrent
                          ? "text-slate-900 font-black"
                          : isPassed
                          ? "text-emerald-700"
                          : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Controls Bar */}
        {order.status !== "completed" && order.status !== "cancelled" && (
          <div className="flex gap-2 pt-1">
            {/* Primary Action Button (Advances to next lifecycle stage) */}
            {currentStepIndex >= 0 && currentStepIndex < LIFECYCLE_STEPS.length - 1 && (
              <button
                type="button"
                onClick={() => updateStatus(LIFECYCLE_STEPS[currentStepIndex + 1].status)}
                disabled={updating}
                className="flex-1 py-2.5 rounded-xl bg-emerald-700 text-white font-extrabold text-xs hover:bg-emerald-800 transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {LIFECYCLE_STEPS[currentStepIndex + 1].icon}
                </span>
                Advance to &quot;{LIFECYCLE_STEPS[currentStepIndex + 1].label}&quot; ➔
              </button>
            )}

            {/* Cancel Order Safeguard Trigger */}
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              disabled={updating}
              className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 font-extrabold text-xs hover:bg-rose-100 border border-rose-200 transition-colors flex items-center justify-center gap-1 shrink-0"
              title="Cancel this order"
            >
              <span className="material-symbols-outlined text-[16px]">cancel</span>
              <span>Cancel</span>
            </button>
          </div>
        )}
      </div>

      {/* Cancellation Safeguard Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center animate-scale-in">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <span className="material-symbols-outlined text-[32px]">warning</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase">
              Cancel Order #{order.order_number}?
            </h3>
            <p className="text-xs text-slate-600 font-medium mt-1">
              Are you sure you want to cancel the order for <strong>{order.customer_name}</strong>? This action will notify the system and cannot be easily reverted.
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs hover:bg-slate-200 transition-colors"
              >
                No, Keep Order
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false);
                  updateStatus("cancelled");
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-extrabold text-xs hover:bg-rose-700 transition-colors shadow-md"
              >
                Yes, Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
