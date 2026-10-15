"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMounted } from "@/hooks/use-mounted";
import type { Order, Rider } from "@/lib/supabase/database.types";

/* -------------------------------------------------------------------------- */
/* Modals                                                                     */
/* -------------------------------------------------------------------------- */

/** Locks page scroll and closes on Escape for as long as it is mounted. */
function useModalChrome(onClose: () => void) {
  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.body.style.overflow = orig;
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);
}

export function RiderAssignModal({
  order,
  riders,
  updating,
  onAssign,
  onClose,
}: {
  order: Order;
  riders: Rider[];
  updating: boolean;
  onAssign: (riderId: string | null) => void;
  onClose: () => void;
}) {
  const mounted = useMounted();
  const [selectedRiderId, setSelectedRiderId] = useState<string>(order.rider_id || "");
  useModalChrome(onClose);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-rider-title"
    >
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-[#00230c] via-[#093816] to-[#00230c] text-white p-5 flex items-start justify-between border-b border-emerald-900/40">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#FFC700] text-slate-950 flex items-center justify-center font-black">
              <span className="material-symbols-outlined text-[18px]">two_wheeler</span>
            </span>
            <div>
              <h3
                id="assign-rider-title"
                className="text-base font-black uppercase tracking-tight text-white"
              >
                Assign Delivery Rider
              </h3>
              <p className="text-xs text-emerald-200/90 font-semibold">
                Order #{order.order_number} • Rs. {order.total}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
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
              {riders.length} registered
            </span>
          </div>

          {riders.length === 0 ? (
            <div className="py-8 px-4 text-center rounded-2xl bg-slate-50 border border-slate-200 border-dashed space-y-2">
              <span className="material-symbols-outlined text-[36px] text-slate-400">no_crash</span>
              <p className="text-sm font-extrabold text-slate-800">No Riders Registered</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                No riders found in database. Create or approve rider accounts in Supabase to
                dispatch orders.
              </p>
            </div>
          ) : (
            riders.map((r, rIdx) => {
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
                          <span className="material-symbols-outlined text-[13px] text-slate-400">
                            call
                          </span>
                          {r.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide border shrink-0 ${statusColor}`}
                  >
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
                onClick={() => onAssign(null)}
                className="px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs transition-colors cursor-pointer"
              >
                Unassign
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!selectedRiderId || updating}
              onClick={() => onAssign(selectedRiderId)}
              className="px-5 py-2.5 rounded-xl bg-[#00230c] hover:bg-[#083d16] text-[#FFC700] font-black text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
            >
              {updating ? (
                <span>Assigning...</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>Confirm &amp; Dispatch</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function CancelOrderModal({
  order,
  onConfirm,
  onClose,
}: {
  order: Order;
  onConfirm: (reason?: string) => void;
  onClose: () => void;
}) {
  const mounted = useMounted();
  const [selectedReason, setSelectedReason] = useState<string>("Customer requested cancellation");
  const [customReason, setCustomReason] = useState<string>("");
  useModalChrome(onClose);

  if (!mounted) return null;

  const finalReason = selectedReason === "Other" ? customReason.trim() : selectedReason;

  return createPortal(
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
          <span className="material-symbols-outlined text-[32px]">warning</span>
        </div>
        <h3 className="text-lg font-black text-slate-900 uppercase">
          Cancel Order #{order.order_number}?
        </h3>
        <p className="text-xs text-slate-600 font-medium mt-1 mb-4">
          Cancel the order for <strong>{order.customer_name}</strong>? A cancellation email will be sent automatically.
        </p>

        <div className="text-left mb-4">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
            Reason for Cancellation
          </label>
          <select
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
          >
            <option value="Customer requested cancellation">Customer requested cancellation</option>
            <option value="Out of delivery area / distance limit">Out of delivery area / distance limit</option>
            <option value="Items unavailable / Kitchen capacity">Items unavailable / Kitchen capacity</option>
            <option value="Duplicate order">Duplicate order</option>
            <option value="Unable to contact customer">Unable to contact customer</option>
            <option value="Other">Other reason...</option>
          </select>

          {selectedReason === "Other" && (
            <input
              type="text"
              placeholder="Specify cancellation reason..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="mt-2 w-full text-xs font-medium p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
            />
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Keep Order
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onConfirm(finalReason || "Cancelled by restaurant");
            }}
            className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-extrabold text-xs hover:bg-rose-700 transition-colors shadow-md cursor-pointer"
          >
            Yes, Cancel Order
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
