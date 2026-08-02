"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Order, OrderItem, Settings } from "@/lib/supabase/database.types";
import { RealtimeChannel } from "@supabase/supabase-js";

interface OrderTrackerProps {
  order: Order;
  items: OrderItem[];
  settings: Settings | null;
}

const STATUS_STEPS = [
  { key: "pending", label: "Order Placed", icon: "receipt" },
  { key: "preparing", label: "Preparing", icon: "restaurant" },
  { key: "ready", label: "Ready", icon: "check_circle" },
  { key: "delivering", label: "Out for Delivery", icon: "delivery_dining" },
  { key: "completed", label: "Delivered", icon: "done_all" },
] as const;

export function OrderTracker({ order, items, settings }: OrderTrackerProps) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(order.status);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(order.eta_minutes || null);

  // Handle hash-based navigation on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!window.location.hash) return;

    const hash = window.location.hash;

    // Clear invalid hashes after a short delay
    const timeout = setTimeout(() => {
      if (hash && !document.querySelector(hash)) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const supabase = createBrowserClient();
    let channel: RealtimeChannel;

    // Subscribe to order status changes
    const setupRealtime = () => {
      channel = supabase
        .channel(`order:${order.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "orders",
            filter: `id=eq.${order.id}`,
          },
          (payload) => {
            const newStatus = payload.new.status;
            if (newStatus) {
              setCurrentStatus(newStatus);
              console.log("Order status updated:", newStatus);
            }
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [order.id]);

  const getCurrentStepIndex = () => {
    return STATUS_STEPS.findIndex((step) => step.key === currentStatus);
  };

  const stepIndex = getCurrentStepIndex();

  // Calculate estimated delivery time
  const getEstimatedTime = () => {
    if (currentStatus === "completed") return "Delivered!";
    if (currentStatus === "delivering") return "Arriving soon!";
    if (currentStatus === "ready") return "Driver is picking up";
    if (currentStatus === "preparing") return "Cooking your order";
    return estimatedTime ? `${estimatedTime} mins` : "Estimated time TBD";
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Navigation */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-surface-container)] text-sm font-semibold hover:bg-[var(--color-surface-container-highest)] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Menu
        </button>
        <button
          onClick={() => router.push("/orders")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-surface-container)] text-sm font-semibold hover:bg-[var(--color-surface-container-highest)] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
          My Orders
        </button>
        <a
          href={`tel:${settings?.phone || "+923029359694"}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-primary-container)] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">call</span>
          Call Restaurant
        </a>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--color-primary)]">
              Order Tracking
            </h1>
            <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">
              Order #{order.order_number}
            </p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-2xl font-bold text-[var(--color-secondary-brand)]">
              {getEstimatedTime()}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8 overflow-x-auto">
        <div className="flex items-center min-w-max gap-2">
          {STATUS_STEPS.map((step, index) => {
            const isCompleted = index < stepIndex;
            const isCurrent = index === stepIndex;
            const isPending = index > stepIndex;

            return (
              <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isCompleted
                        ? "bg-[var(--color-success)] text-white"
                        : isCurrent
                        ? "bg-[var(--color-primary)] text-white animate-pulse"
                        : "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {isCompleted ? "check" : step.icon}
                    </span>
                  </div>
                  <span className="text-xs font-medium mt-2 text-center">
                    {step.label}
                  </span>
                </div>

                {index < STATUS_STEPS.length - 1 && (
                  <div
                    className={`w-16 h-1 mx-2 rounded-full transition-all duration-300 ${
                      index < stepIndex ? "bg-[var(--color-success)]" : "bg-[var(--color-surface-container)]"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Details Card */}
      <div className="bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-2xl)] border border-[var(--color-surface-variant)] p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">Order Details</h2>

        <div className="space-y-4">
          {/* Items */}
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-container-low)]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[var(--color-on-surface-variant)]">x{item.quantity}</span>
                  <span className="font-medium">{item.name_snapshot}</span>
                </div>
                <span className="font-semibold">Rs. {item.line_total}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-[var(--color-outline-variant)] pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-on-surface-variant)]">Subtotal</span>
              <span>Rs. {order.subtotal}</span>
            </div>
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-on-surface-variant)]">
                  Delivery {order.delivery_distance_km ? `(${order.delivery_distance_km} km)` : ""}
                </span>
                <span>Rs. {order.delivery_fee}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span className="text-[var(--color-primary)]">Rs. {order.total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-2xl)] border border-[var(--color-surface-variant)] p-6">
        <h2 className="text-lg font-bold mb-4">Delivery Information</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[var(--color-on-surface-variant)] mt-0.5">person</span>
            <div>
              <p className="font-medium">{order.customer_name}</p>
              <p className="text-[var(--color-on-surface-variant)]">{order.customer_phone}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[var(--color-on-surface-variant)] mt-0.5">location_on</span>
            <p className="flex-1">{order.customer_address}</p>
          </div>
          {order.customer_note && (
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[var(--color-on-surface-variant)] mt-0.5">note</span>
              <p className="flex-1 text-[var(--color-on-surface-variant)] italic">"{order.customer_note}"</p>
            </div>
          )}

          {/* Delivery Coordinates and Navigation */}
          {order.delivery_coordinates && (
            <div className="mt-4 p-4 rounded-xl bg-[var(--color-surface-container-low)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">straight</span>
                  <span className="text-xs text-[var(--color-on-surface-variant)]">
                    {order.delivery_distance_km ? `${order.delivery_distance_km.toFixed(1)} km` : "Distance calculated"}
                  </span>
                </div>
                <span className="font-bold text-sm text-[var(--color-primary)]">
                  Delivery: Rs. {order.delivery_fee || 0}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-[var(--color-on-surface-variant)]">
                <span className="material-symbols-outlined text-[14px]">my_location</span>
                <span>
                  {order.delivery_coordinates.lat.toFixed(6)}, {order.delivery_coordinates.lng.toFixed(6)}
                </span>
              </div>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${order.delivery_coordinates.lat},${order.delivery_coordinates.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold hover:bg-[var(--color-primary-container)] transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">navigation</span>
                Navigate in Google Maps
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Status Timeline */}
      <div className="mt-6 bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-2xl)] border border-[var(--color-surface-variant)] p-6">
        <h2 className="text-lg font-bold mb-6">Order Timeline</h2>
        <div className="relative space-y-0">
          {/* Vertical connecting line */}
          <div className="absolute left-4 top-3 bottom-3 w-0.5 bg-[var(--color-outline-variant)]" />

          <div className="relative flex gap-4 pb-5">
            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${currentStatus === "pending" ? "bg-[var(--color-primary)] text-white animate-pulse" : "bg-[var(--color-success)] text-white"}`}>
              <span className="material-symbols-outlined text-[16px]">receipt</span>
            </div>
            <div className="pt-1.5">
              <p className="font-semibold">Order Placed</p>
              <p className="text-[var(--color-on-surface-variant)] text-xs mt-0.5">
                {new Date(order.placed_at).toLocaleString()}
              </p>
            </div>
          </div>

          {order.confirmed_at && (
            <div className="relative flex gap-4 pb-5">
              <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[var(--color-success)] text-white">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
              </div>
              <div className="pt-1.5">
                <p className="font-semibold">Order Confirmed</p>
                <p className="text-[var(--color-on-surface-variant)] text-xs mt-0.5">
                  {new Date(order.confirmed_at).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {order.preparing_at && (
            <div className="relative flex gap-4 pb-5">
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${currentStatus === "preparing" ? "bg-[var(--color-primary)] text-white animate-pulse" : "bg-[var(--color-success)] text-white"}`}>
                <span className="material-symbols-outlined text-[16px]">restaurant</span>
              </div>
              <div className="pt-1.5">
                <p className="font-semibold">Preparing</p>
                <p className="text-[var(--color-on-surface-variant)] text-xs mt-0.5">
                  {new Date(order.preparing_at).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {order.ready_at && (
            <div className="relative flex gap-4 pb-5">
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${currentStatus === "ready" ? "bg-[var(--color-primary)] text-white animate-pulse" : "bg-[var(--color-success)] text-white"}`}>
                <span className="material-symbols-outlined text-[16px]">checklist</span>
              </div>
              <div className="pt-1.5">
                <p className="font-semibold">Ready</p>
                <p className="text-[var(--color-on-surface-variant)] text-xs mt-0.5">
                  {new Date(order.ready_at).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {order.delivering_at && (
            <div className="relative flex gap-4 pb-5">
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${currentStatus === "delivering" ? "bg-[var(--color-primary)] text-white animate-pulse" : "bg-[var(--color-success)] text-white"}`}>
                <span className="material-symbols-outlined text-[16px]">delivery_dining</span>
              </div>
              <div className="pt-1.5">
                <p className="font-semibold">Out for Delivery</p>
                <p className="text-[var(--color-on-surface-variant)] text-xs mt-0.5">
                  {new Date(order.delivering_at).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {order.completed_at && (
            <div className="relative flex gap-4 pb-5">
              <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[var(--color-success)] text-white">
                <span className="material-symbols-outlined text-[16px]">done_all</span>
              </div>
              <div className="pt-1.5">
                <p className="font-semibold">Delivered</p>
                <p className="text-[var(--color-on-surface-variant)] text-xs mt-0.5">
                  {new Date(order.completed_at).toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
