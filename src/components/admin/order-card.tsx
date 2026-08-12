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

  const cfg = STATUS_CONFIG[order.status];
  const parsed = parseOrderNote(order.customer_note);
  const isPickup =
    parsed.orderTypeTag === "PICKUP" ||
    order.customer_address?.toLowerCase().includes("store pickup");

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
        `Order ${order.order_number} → ${STATUS_CONFIG[newStatus].label}`
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
        {/* Customer Header */}
        <div className="flex justify-between items-start mb-5">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
              {order.customer_name}
            </h3>
            <a
              href={`tel:${order.customer_phone}`}
              className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-emerald-700 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">call</span>
              {order.customer_phone}
            </a>
          </div>
          <div className="text-right flex flex-col items-end gap-1.5">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${cfg.bg} ${cfg.text} shadow-sm border border-black/5`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {cfg.icon}
              </span>
              {cfg.label}
            </span>
            <div className="flex flex-col items-end">
              <span className="text-sm font-extrabold text-slate-400">
                {order.order_number}
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                {timeAgo(order.placed_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Badges / Order Meta */}
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

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/70">
            <span className="material-symbols-outlined text-[14px]">payments</span>
            {parsed.paymentTag === "BANK_TRANSFER" ? "Bank Transfer" : "COD"}
          </span>

          {parsed.unavailableTag && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200/70">
              <span className="material-symbols-outlined text-[14px]">error</span>
              If unavailable: {parsed.unavailableTag}
            </span>
          )}
        </div>

        {/* Custom note */}
        {parsed.customNote && (
          <div className="mb-5 flex items-start gap-2 text-sm text-slate-700 bg-amber-50/50 p-3 rounded-xl border border-amber-200/50">
            <span className="material-symbols-outlined text-[18px] text-amber-600 shrink-0 mt-0.5">
              sticky_note_2
            </span>
            <span className="italic font-medium">{parsed.customNote}</span>
          </div>
        )}

        {/* Map Integration */}
        {!isPickup && (
          <div className="mb-6 bg-slate-50 p-1 rounded-[10px] border border-slate-200 shadow-sm">
            {order.delivery_coordinates ? (
              <OrderMap
                deliveryLat={order.delivery_coordinates.lat}
                deliveryLng={order.delivery_coordinates.lng}
                onRouteCalculated={(info) => setCalculatedDistance(info.distanceKm)}
              />
            ) : (
              <div className="w-full h-40 bg-slate-100 rounded-lg flex items-center justify-center flex-col text-slate-400">
                <span className="material-symbols-outlined text-[32px] mb-2">location_off</span>
                <span className="text-sm font-semibold">No map coordinates</span>
              </div>
            )}
            <div className="flex items-start justify-between gap-3 p-3">
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Delivery Address</p>
                <p className="text-sm font-semibold text-slate-700 leading-snug">
                  {order.customer_address}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Distance</p>
                <p className="text-sm font-bold text-emerald-700">
                  {calculatedDistance !== null
                    ? `${calculatedDistance.toFixed(1)} km`
                    : order.delivery_distance_km
                    ? `${order.delivery_distance_km.toFixed(1)} km`
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="mb-6">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            Order Items
            <span className="bg-slate-200 text-slate-600 py-0.5 px-2 rounded-full text-[10px]">{items.length}</span>
          </h4>
          
          {items.length > 0 ? (
            <div className="space-y-2">
              {items.map((item) => {
                const menuItem = MENU_ITEMS.find(m => m.name === item.name_snapshot);
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-white border border-slate-200 shadow-sm">
                      {menuItem?.image_path ? (
                        <Image
                          src={menuItem.image_path}
                          alt={item.name_snapshot}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300">
                          <span className="material-symbols-outlined text-[24px]">restaurant</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-800 truncate">
                        {item.name_snapshot}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                         <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-black bg-[#00230c] text-[#FFC700]">
                           {item.quantity}×
                         </span>
                         <span className="text-xs font-medium text-slate-500">
                           @ Rs. {item.price_snapshot}
                         </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <p className="font-black text-sm text-emerald-800">
                        Rs. {item.line_total}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 border-dashed text-sm text-amber-800 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-amber-600">
                warning
              </span>
              <span className="font-medium">No line items recorded for this order.</span>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="pt-4 border-t border-slate-200/80">
          <div className="flex justify-between items-center mb-1 text-sm text-slate-500">
             <span>Subtotal</span>
             <span className="font-semibold text-slate-700">Rs. {order.subtotal}</span>
          </div>
          {!isPickup && (
             <div className="flex justify-between items-center mb-2 text-sm text-slate-500">
               <span>Delivery Fee</span>
               <span className="font-semibold text-slate-700">Rs. {order.delivery_fee}</span>
             </div>
          )}
          <div className="flex justify-between items-end mt-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Total Amount
            </span>
            <span className="font-black text-[22px] text-emerald-700 leading-none">
              Rs. {order.total}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {order.status !== "completed" && order.status !== "cancelled" && (
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
          {order.status === "pending" && (
            <button
              onClick={() => updateStatus("preparing")}
              disabled={updating}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm
                hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">
                soup_kitchen
              </span>
              Start Preparing
            </button>
          )}
          {order.status === "preparing" && (
            <button
              onClick={() => updateStatus("ready")}
              disabled={updating}
              className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-bold text-sm
                hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">
                checklist
              </span>
              Mark Ready
            </button>
          )}
          {order.status === "ready" && (
            <button
              onClick={() => updateStatus("delivering")}
              disabled={updating}
              className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm
                hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
              title="Send order to Rider Dashboard"
            >
              <span className="material-symbols-outlined text-[18px]">
                delivery_dining
              </span>
              Out for Delivery
            </button>
          )}
          {order.status === "delivering" && (
            <button
              onClick={() => updateStatus("completed")}
              disabled={updating}
              className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm
                hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">
                task_alt
              </span>
              Mark Delivered
            </button>
          )}
          <button
            onClick={() => updateStatus("cancelled")}
            disabled={updating}
            className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 font-bold
              hover:bg-rose-100 disabled:opacity-50 transition-colors flex items-center justify-center border border-rose-200"
            title="Cancel order"
          >
            <span className="material-symbols-outlined text-[20px]">cancel</span>
          </button>
        </div>
      )}
    </div>
  );
}
