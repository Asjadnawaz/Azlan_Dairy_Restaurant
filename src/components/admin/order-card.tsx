"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Order, OrderItem, OrderStatus } from "@/lib/supabase/database.types";
import { toast } from "sonner";

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; icon: string }
> = {
  pending: {
    label: "Pending",
    bg: "bg-amber-100",
    text: "text-amber-700",
    icon: "hourglass_top",
  },
  preparing: {
    label: "Preparing",
    bg: "bg-blue-100",
    text: "text-blue-700",
    icon: "soup_kitchen",
  },
  ready: {
    label: "Ready",
    bg: "bg-purple-100",
    text: "text-purple-700",
    icon: "checklist",
  },
  delivering: {
    label: "Delivering",
    bg: "bg-indigo-100",
    text: "text-indigo-700",
    icon: "delivery_dining",
  },
  completed: {
    label: "Completed",
    bg: "bg-green-100",
    text: "text-green-700",
    icon: "task_alt",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-red-100",
    text: "text-red-700",
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

export function OrderCard({
  order,
  items,
}: {
  order: Order;
  items: OrderItem[];
}) {
  const [updating, setUpdating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const supabase = createBrowserClient();
  const cfg = STATUS_CONFIG[order.status];

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

      toast.success(`Order ${order.order_number} → ${STATUS_CONFIG[newStatus].label}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update order status");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div
      className={`rounded-[var(--radius-xl)] border bg-[var(--color-surface-container-lowest)]
        border-[var(--color-outline-variant)] overflow-hidden transition-all
        ${order.status === "pending" ? "ring-2 ring-amber-400/50" : ""}`}
    >
      {/* Header */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.text}`}
          >
            <span className="material-symbols-outlined text-[20px]">{cfg.icon}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[var(--color-primary)]">
                {order.order_number}
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text}`}
              >
                {cfg.label}
              </span>
            </div>
            <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
              {timeAgo(order.placed_at)} · {items.length} item{items.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 rounded-full hover:bg-[var(--color-surface-container)]"
          aria-label="Toggle details"
        >
          <span
            className="material-symbols-outlined text-[20px] transition-transform"
            style={{ transform: expanded ? "rotate(180deg)" : "none" }}
          >
            keyboard_arrow_down
          </span>
        </button>
      </div>

      {/* Customer + Total */}
      <div className="px-4 pb-3 space-y-1.5 text-sm">
        <div className="flex items-center gap-2 text-[var(--color-on-surface-variant)]">
          <span className="material-symbols-outlined text-[16px]">person</span>
          <span className="font-medium text-[var(--color-on-surface)]">{order.customer_name}</span>
        </div>
        <div className="flex items-center gap-2 text-[var(--color-on-surface-variant)]">
          <span className="material-symbols-outlined text-[16px]">call</span>
          <a href={`tel:${order.customer_phone}`} className="hover:underline">
            {order.customer_phone}
          </a>
        </div>
        <div className="flex items-start gap-2 text-[var(--color-on-surface-variant)]">
          <span className="material-symbols-outlined text-[16px] mt-0.5">location_on</span>
          <span className="flex-1">{order.customer_address}</span>
        </div>

        {/* Delivery Information */}
        <div className="mt-3 p-3 rounded-lg bg-[var(--color-surface-container-low)] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">straight</span>
              <span className="text-xs text-[var(--color-on-surface-variant)]">
                {order.delivery_distance_km ? `${order.delivery_distance_km.toFixed(1)} km` : "Standard delivery"}
              </span>
            </div>
            <span className="font-bold text-sm text-[var(--color-primary)]">
              Delivery: Rs. {order.delivery_fee || 60}
            </span>
          </div>

          {/* Google Maps Navigation Button */}
          {order.delivery_coordinates ? (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${order.delivery_coordinates.lat},${order.delivery_coordinates.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold hover:bg-[var(--color-primary-container)] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">navigation</span>
              Open in Google Maps
            </a>
          ) : order.customer_address ? (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customer_address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold hover:bg-[var(--color-primary-container)] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">navigation</span>
              Open in Google Maps
            </a>
          ) : null}
        </div>
        {order.customer_note && (
          <div className="flex items-start gap-2 text-[var(--color-on-surface-variant)]">
            <span className="material-symbols-outlined text-[16px] mt-0.5">sticky_note_2</span>
            <span className="flex-1 italic">{order.customer_note}</span>
          </div>
        )}
        <div className="pt-2 border-t border-[var(--color-outline-variant)]/50 flex items-center justify-between">
          <span className="text-xs text-[var(--color-on-surface-variant)]">Total</span>
          <span className="font-extrabold text-[var(--color-primary)] text-lg">
            Rs. {order.total}
          </span>
        </div>
      </div>

      {/* Expanded: line items */}
      {expanded && items.length > 0 && (
        <div className="px-4 pb-3 border-t border-[var(--color-outline-variant)]/50 pt-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)] mb-2">
            Items
          </p>
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between text-sm">
                <span>
                  <span className="font-semibold">{item.quantity}×</span>{" "}
                  {item.name_snapshot}
                </span>
                <span className="text-[var(--color-on-surface-variant)]">
                  Rs. {item.line_total}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      {order.status !== "completed" && order.status !== "cancelled" && (
        <div className="px-4 pb-4 pt-2 flex gap-2 flex-wrap">
          {order.status === "pending" && (
            <button
              onClick={() => updateStatus("preparing")}
              disabled={updating}
              className="flex-1 min-w-[120px] py-2.5 rounded-full bg-blue-500 text-white font-bold text-sm
                hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">soup_kitchen</span>
              Start Preparing
            </button>
          )}
          {order.status === "preparing" && (
            <button
              onClick={() => updateStatus("ready")}
              disabled={updating}
              className="flex-1 min-w-[120px] py-2.5 rounded-full bg-purple-500 text-white font-bold text-sm
                hover:bg-purple-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">checklist</span>
              Mark Ready
            </button>
          )}
          {order.status === "ready" && (
            <button
              onClick={() => updateStatus("completed")}
              disabled={updating}
              className="flex-1 min-w-[120px] py-2.5 rounded-full bg-[var(--color-success)] text-white font-bold text-sm
                hover:brightness-110 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">task_alt</span>
              Complete
            </button>
          )}
          <button
            onClick={() => updateStatus("cancelled")}
            disabled={updating}
            className="py-2.5 px-4 rounded-full bg-[var(--color-error)]/10 text-[var(--color-error)] font-bold text-sm
              hover:bg-[var(--color-error)]/20 disabled:opacity-50 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">cancel</span>
          </button>
        </div>
      )}
    </div>
  );
}
