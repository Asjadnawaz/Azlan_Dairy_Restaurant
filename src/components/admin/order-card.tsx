"use client";

/**
 * The order detail card, plus the pieces the horizontal order row shares with
 * it: status config, the kitchen stepper, the rider-assign and cancel modals,
 * and the PATCH helpers. Everything lives here so order-row.tsx can import in
 * one direction and there is no duplicate copy of a write path.
 *
 * Status colour uses **emphasis**, not one hue per status: only `pending`
 * (needs attention now) and `cancelled` (something went wrong) are coloured, and
 * both always ship an icon plus a label so colour never carries the meaning
 * alone. A six-hue status palette was measured first and failed CVD separation
 * badly (deutan ΔE 0.3 between two of the hues), and colouring all nine statuses
 * buried the one that actually needs the admin's hands.
 */

import { useCallback, useRef, useState } from "react";
import { MenuImage } from "@/components/menu/menu-image";
import dynamic from "next/dynamic";
import { MENU_ITEMS } from "@/data/menu";
import type { Order, OrderItem, OrderStatus, Rider } from "@/lib/supabase/database.types";
import { CancelOrderModal, RiderAssignModal } from "./order-modals";
import { isPickupOrder, parseOrderNote, timeAgo } from "@/lib/orders";
import { toast } from "sonner";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

const OrderMap = dynamic(() => import("./order-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-40 bg-slate-100 animate-pulse rounded-[var(--radius-lg)]"></div>
  ),
});

/* -------------------------------------------------------------------------- */
/* Shared status vocabulary                                                   */
/* -------------------------------------------------------------------------- */

export type StatusTone = "warning" | "critical" | "neutral";

export const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; icon: string; tone: StatusTone }
> = {
  pending: { label: "Pending", icon: "hourglass_top", tone: "warning" },
  preparing: { label: "Preparing", icon: "soup_kitchen", tone: "neutral" },
  ready: { label: "Ready", icon: "checklist", tone: "neutral" },
  picked_up: { label: "Picked Up", icon: "takeout_dining", tone: "neutral" },
  out_for_delivery: { label: "Out for Delivery", icon: "delivery_dining", tone: "neutral" },
  delivering: { label: "Out for Delivery", icon: "delivery_dining", tone: "neutral" },
  delivered: { label: "Delivered", icon: "task_alt", tone: "neutral" },
  completed: { label: "Delivered", icon: "task_alt", tone: "neutral" },
  cancelled: { label: "Cancelled", icon: "cancel", tone: "critical" },
};

/**
 * Chip surfaces. Each ink was measured against its own tint, not against white:
 * warning 6.75:1, critical 7.78:1, neutral 8.40:1 — all clear AA for small text.
 */
export const TONE_CLASS: Record<StatusTone, string> = {
  warning: "bg-[#fff6e0] text-[#7a4d00] border-[#f2ce77]",
  critical: "bg-[#fdeceb] text-[#8f1d1d] border-[#f2b8b5]",
  neutral:
    "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] border-[var(--color-outline-variant)]",
};

export const ADMIN_STEPS: { status: OrderStatus; label: string; icon: string }[] = [
  { status: "pending", label: "Pending", icon: "hourglass_top" },
  { status: "preparing", label: "Preparing", icon: "soup_kitchen" },
  { status: "ready", label: "Ready", icon: "checklist" },
];

export function StatusChip({ status, size = "sm" }: { status: OrderStatus; size?: "sm" | "xs" }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-bold whitespace-nowrap ${
        TONE_CLASS[cfg.tone]
      } ${size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]"}`}
    >
      <span className="material-symbols-outlined text-[13px]" aria-hidden="true">
        {cfg.icon}
      </span>
      {cfg.label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Write paths                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The two PATCH calls every admin surface needs. A ref guards re-entry rather
 * than the `updating` state, and the callbacks close over scalars (`id`,
 * `order_number`) instead of the order object, so they stay referentially stable
 * across a realtime update and a memoised row is not re-rendered by its own
 * click handler changing identity.
 */
export function useOrderActions(order: Order, riders: Rider[]) {
  const [updating, setUpdating] = useState(false);
  const busy = useRef(false);
  const { id, order_number: orderNumber } = order;

  const patch = useCallback(
    async (body: Record<string, unknown>, onOk: () => void, fallback: string) => {
      if (busy.current) return;
      busy.current = true;
      setUpdating(true);
      try {
        const res = await fetch(`/api/orders/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || data.error || fallback);
        onOk();
      } catch (err: unknown) {
        toast.error(getErrorMessage(err, fallback));
      } finally {
        busy.current = false;
        setUpdating(false);
      }
    },
    [id]
  );

  const updateStatus = useCallback(
    (newStatus: OrderStatus, cancellationReason?: string) =>
      patch(
        {
          status: newStatus,
          ...(cancellationReason ? { cancellation_reason: cancellationReason } : {}),
        },
        () => toast.success(`Order #${orderNumber} → ${STATUS_CONFIG[newStatus].label}`),
        "Failed to update order status"
      ),
    [patch, orderNumber]
  );

  const assignRider = useCallback(
    (riderIdToSet: string | null) =>
      patch(
        { rider_id: riderIdToSet },
        () => {
          if (riderIdToSet) {
            const target = riders.find((r) => r.id === riderIdToSet);
            toast.success(`Assigned to ${target?.name || "Rider"} for Order #${orderNumber}!`);
          } else {
            toast.success(`Rider unassigned from Order #${orderNumber}`);
          }
        },
        "Failed to assign rider"
      ),
    [patch, orderNumber, riders]
  );

  return { updating, updateStatus, assignRider };
}

/* -------------------------------------------------------------------------- */
/* The card                                                                   */
/* -------------------------------------------------------------------------- */

export function OrderCard({
  order,
  items,
  riders,
  onPrint,
  variant = "standalone",
}: {
  order: Order;
  items: OrderItem[];
  /** Fetched once by the shell — never per card. */
  riders: Rider[];
  onPrint?: (order: Order, items: OrderItem[], width?: "80mm" | "58mm") => void;
  /** "detail" drops the header, because the order row above already shows it. */
  variant?: "standalone" | "detail";
}) {
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRiderModal, setShowRiderModal] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const { updating, updateStatus, assignRider } = useOrderActions(order, riders);

  const cfg = STATUS_CONFIG[order.status];
  const parsed = parseOrderNote(order.customer_note);
  const isPickup = isPickupOrder(order, parsed);

  const adminStepIndex = ADMIN_STEPS.findIndex((s) => s.status === order.status);
  const isInRiderTerritory = adminStepIndex === -1 && order.status !== "cancelled";

  const assignedRider = riders.find(
    (r) => r.id === order.rider_id || r.user_id === order.rider_id
  );

  const isDetail = variant === "detail";

  return (
    <div
      className={
        isDetail
          ? ""
          : `rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden ${
              order.status === "pending"
                ? "border-amber-300 ring-1 ring-amber-300/50"
                : "border-slate-200"
            }`
      }
    >
      <div className={isDetail ? "" : "p-5"}>
        {!isDetail && (
          <div className="flex justify-between items-start gap-2 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 leading-tight">
                  {order.customer_name}
                </h3>
                <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-xs font-black text-slate-800">
                  {order.order_number}
                </span>
              </div>
              <a
                href={`tel:${order.customer_phone}`}
                className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 font-bold text-xs transition-colors"
              >
                <span className="material-symbols-outlined text-[14px] text-emerald-600">call</span>
                {order.customer_phone}
              </a>
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              <StatusChip status={order.status} />
              <span className="text-[11px] font-semibold text-slate-500">
                {timeAgo(order.placed_at)}
              </span>
            </div>
          </div>
        )}

        {!isDetail && (
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                isPickup
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-blue-50 text-blue-800 border-blue-200"
              }`}
            >
              <span className="material-symbols-outlined text-[13px]">
                {isPickup ? "storefront" : "local_shipping"}
              </span>
              {isPickup ? "Pickup" : "Delivery"}
            </span>
            {parsed.isCod ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-amber-100 text-amber-950 border border-amber-300">
                <span className="material-symbols-outlined text-[13px] text-amber-700">
                  payments
                </span>
                COD: Rs. {order.total}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300">
                <span className="material-symbols-outlined text-[13px] text-emerald-600">
                  account_balance_wallet
                </span>
                Bank Transfer
              </span>
            )}
            {parsed.unavailableTag && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                <span className="material-symbols-outlined text-[13px]">error</span>
                {parsed.unavailableTag}
              </span>
            )}
          </div>
        )}

        {parsed.customNote && (
          <div className="mb-4 flex items-start gap-2 text-xs text-slate-800 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80">
            <span className="material-symbols-outlined text-[16px] text-amber-700 shrink-0 mt-0.5">
              sticky_note_2
            </span>
            <span className="italic font-bold">{parsed.customNote}</span>
          </div>
        )}

        {!isPickup && (
          <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-0.5">
                  Address
                </p>
                <p className="text-sm font-bold text-slate-900 leading-snug">
                  {order.customer_address}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-0.5">
                  Distance
                </p>
                <p className="text-sm font-black text-emerald-800">
                  {calculatedDistance !== null
                    ? `${calculatedDistance.toFixed(1)} km`
                    : order.delivery_distance_km
                    ? `${order.delivery_distance_km.toFixed(1)} km`
                    : "N/A"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMapExpanded(!isMapExpanded)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px] text-blue-600">
                {isMapExpanded ? "map" : "pin_drop"}
              </span>
              {isMapExpanded ? "Hide Map" : "Show Map"}
              <span className="material-symbols-outlined text-[15px]">
                {isMapExpanded ? "expand_less" : "expand_more"}
              </span>
            </button>
            {isMapExpanded && (
              <div className="rounded-xl overflow-hidden border border-slate-200 animate-fade-in">
                {order.delivery_coordinates ? (
                  <OrderMap
                    deliveryLat={order.delivery_coordinates.lat}
                    deliveryLng={order.delivery_coordinates.lng}
                    onRouteCalculated={(info) => setCalculatedDistance(info.distanceKm)}
                  />
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
            Items{" "}
            <span className="bg-slate-200 text-slate-800 py-0.5 px-1.5 rounded-full text-[10px] font-black">
              {items.length}
            </span>
          </h4>
          {items.length > 0 ? (
            <div className="space-y-1.5">
              {items.map((item, idx) => {
                const menuItem = MENU_ITEMS.find((m) => m.name === item.name_snapshot);
                return (
                  <div
                    key={`${order.id}-${item.id || item.name_snapshot}-${idx}`}
                    className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 bg-slate-50/50"
                  >
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white border border-slate-200">
                      {menuItem?.image_path ? (
                        <MenuImage
                          src={menuItem.image_path}
                          alt={item.name_snapshot}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                          <span className="material-symbols-outlined text-[18px]">restaurant</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 truncate">
                        {item.name_snapshot}
                      </h4>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {item.quantity}× @ Rs. {item.price_snapshot}
                      </span>
                    </div>
                    <span className="font-black text-sm text-emerald-900 shrink-0">
                      Rs. {item.line_total}
                    </span>
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
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
              Total
            </span>
            <span className="text-xl font-black text-[#00230c]">Rs. {order.total}</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200">
          <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
            <span>Kitchen &amp; Delivery Progress</span>
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
                <span className="material-symbols-outlined text-[18px] text-indigo-600">
                  delivery_dining
                </span>
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
                style={{
                  width: `${Math.max(0, (adminStepIndex / (ADMIN_STEPS.length - 1)) * 100)}%`,
                }}
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
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                          isPassed
                            ? "bg-emerald-600 text-white"
                            : isCurrent
                            ? "bg-[#00230c] text-[#FFC700] ring-4 ring-emerald-200 scale-110"
                            : "bg-slate-200 text-slate-500 group-hover:bg-slate-300"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          {isPassed ? "check" : step.icon}
                        </span>
                      </div>
                      <span
                        className={`mt-1 text-[11px] font-bold transition-colors ${
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
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-100 mt-2">
          {!isPickup &&
            order.status !== "completed" &&
            order.status !== "cancelled" &&
            order.status !== "delivered" && (
              <div>
                {order.rider_id ? (
                  <div className="p-2.5 rounded-xl bg-indigo-50/90 border border-indigo-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <span className="material-symbols-outlined text-[18px]">two_wheeler</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-extrabold uppercase text-indigo-700">
                            Assigned Rider
                          </span>
                          {assignedRider?.status && (
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                assignedRider.status === "available"
                                  ? "bg-emerald-500"
                                  : "bg-amber-500"
                              }`}
                            />
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

          {!isInRiderTerritory &&
            order.status !== "completed" &&
            order.status !== "cancelled" &&
            order.status !== "delivered" && (
              <div className="flex gap-2">
                {adminStepIndex >= 0 && adminStepIndex < ADMIN_STEPS.length - 1 && (
                  <button
                    type="button"
                    onClick={() => updateStatus(ADMIN_STEPS[adminStepIndex + 1].status)}
                    disabled={updating}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-700 text-white font-extrabold text-xs hover:bg-emerald-800 transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer active:scale-[0.99]"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {ADMIN_STEPS[adminStepIndex + 1].icon}
                    </span>
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

      {showRiderModal && (
        <RiderAssignModal
          order={order}
          riders={riders}
          updating={updating}
          onAssign={(id) => {
            setShowRiderModal(false);
            void assignRider(id);
          }}
          onClose={() => setShowRiderModal(false)}
        />
      )}

      {showCancelModal && (
        <CancelOrderModal
          order={order}
          onConfirm={(reason) => void updateStatus("cancelled", reason)}
          onClose={() => setShowCancelModal(false)}
        />
      )}
    </div>
  );
}
