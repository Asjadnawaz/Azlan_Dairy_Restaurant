"use client";

import { useState } from "react";
import type { Order, OrderItem } from "@/lib/supabase/database.types";
import { toast } from "sonner";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
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

function parseOrderNote(noteStr: string | null) {
  if (!noteStr)
    return {
      orderTypeTag: null,
      paymentTag: null,
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

  const customNote = remaining.trim();

  return { orderTypeTag, paymentTag, customNote };
}

export function RiderOrderCard({
  order,
  items,
  onStatusUpdated,
}: {
  order: Order;
  items: OrderItem[];
  onStatusUpdated: () => void;
}) {
  const [updating, setUpdating] = useState(false);
  const parsed = parseOrderNote(order.customer_note);

  const googleMapsUrl = order.delivery_coordinates?.lat && order.delivery_coordinates?.lng
    ? `https://www.google.com/maps?q=${order.delivery_coordinates.lat},${order.delivery_coordinates.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customer_address)}`;

  async function handleMarkDelivered() {
    if (updating) return;
    setUpdating(true);

    try {
      const res = await fetch(`/api/rider/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to complete delivery");
      }

      toast.success(`Order #${order.order_number} marked as Delivered! 🎉`);
      onStatusUpdated();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to update order status"));
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden flex flex-col justify-between transition-all hover:border-emerald-500/40">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex justify-between items-start gap-3">
          <div>
            <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-black bg-[#00230c] text-[#FFC700] mb-1.5">
              #{order.order_number}
            </span>
            <h3 className="text-xl font-extrabold text-slate-900 leading-tight">
              {order.customer_name}
            </h3>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-bold text-slate-400 block">
              {timeAgo(order.placed_at)}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 mt-1">
              {parsed.paymentTag === "BANK_TRANSFER" ? "Paid (Bank Transfer)" : "Collect Cash (COD)"}
            </span>
          </div>
        </div>
      </div>

      {/* Body: Contact & Navigation & Address */}
      <div className="p-5 space-y-4 flex-1">
        {/* Quick Action Bar: Call Customer & Launch Maps */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href={`tel:${order.customer_phone}`}
            className="py-3 px-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold text-sm flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">call</span>
            Call Customer
          </a>

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-3 px-4 rounded-2xl bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-md"
          >
            <span className="material-symbols-outlined text-[20px]">near_me</span>
            Google Maps
          </a>
        </div>

        {/* Address Card */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-rose-600 text-[22px] shrink-0 mt-0.5">
              location_on
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Delivery Location
              </p>
              <p className="text-sm font-extrabold text-slate-800 leading-snug mt-0.5">
                {order.customer_address}
              </p>
              {order.delivery_distance_km !== null && order.delivery_distance_km !== undefined && (
                <p className="text-xs font-bold text-emerald-700 mt-1">
                  Est. Distance: {order.delivery_distance_km.toFixed(1)} km
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Customer Notes */}
        {parsed.customNote && (
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] text-amber-600 shrink-0">
              sticky_note_2
            </span>
            <span className="font-semibold">{parsed.customNote}</span>
          </div>
        )}

        {/* Order Items Breakdown */}
        <div>
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
            Order Items ({items.length})
          </p>
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/60"
              >
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-black bg-[#00230c] text-[#FFC700]">
                    {item.quantity}×
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {item.name_snapshot}
                  </span>
                </div>
                <span className="text-xs font-extrabold text-slate-700">
                  Rs. {item.line_total}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer: Amount & Mark Delivered Button */}
      <div className="p-5 border-t border-slate-100 bg-slate-50/80 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Total to Collect
          </span>
          <span className="text-2xl font-black text-emerald-700">
            Rs. {order.total}
          </span>
        </div>

        {order.status === "completed" ? (
          <div className="py-3 rounded-2xl bg-emerald-100 text-emerald-800 font-extrabold text-sm text-center flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[20px]">task_alt</span>
            Delivered &amp; Completed
          </div>
        ) : (
          <button
            onClick={handleMarkDelivered}
            disabled={updating}
            className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {updating ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin">
                  progress_activity
                </span>
                Updating Status...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                Mark as Delivered
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
