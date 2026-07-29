"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_path?: string | null;
}

interface StoredOrder {
  orderNumber: string;
  phone: string;
  total: number;
  timestamp: number;
  items?: OrderItem[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<StoredOrder[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("azlan-orders");
      if (stored) setOrders(JSON.parse(stored));
    } catch {
      setOrders([]);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div className="mx-auto max-w-3xl px-4 py-10">

        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--color-primary)] tracking-tight">
              My Orders
            </h1>
            <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">
              Your last {orders.length || 0} order{orders.length !== 1 ? "s" : ""} from Azlan Dairy Restaurant
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--color-surface-container-highest)] text-sm font-semibold hover:bg-[var(--color-primary)] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Menu
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="material-symbols-outlined text-[72px] text-[var(--color-on-surface-variant)]/30">
              receipt_long
            </span>
            <p className="mt-4 text-lg font-bold text-[var(--color-on-surface)]">No orders yet</p>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
              Your recent orders will appear here once you place one.
            </p>
            <Link
              href="/#menu"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--color-primary)] text-white font-bold text-sm hover:bg-[var(--color-primary-container)] transition-colors custom-shadow"
            >
              <span className="material-symbols-outlined text-[20px]">local_pizza</span>
              Explore Menu
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {orders.map((order) => (
              <div
                key={order.orderNumber + order.timestamp}
                className="bg-[var(--color-surface-container-lowest)] rounded-2xl border border-[var(--color-surface-variant)] overflow-hidden custom-shadow"
              >
                {/* Order header */}
                <div
                  className="px-5 py-4 flex items-center justify-between gap-4"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--color-primary) 0%, #0a3318 100%)",
                  }}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-mint-accent)]">
                      Order
                    </span>
                    <span className="text-lg font-extrabold text-white tracking-tight">
                      #{order.orderNumber}
                    </span>
                    <span className="text-xs text-white/60 mt-0.5">
                      {new Date(order.timestamp).toLocaleString("en-PK", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/60 font-medium">Total Paid</p>
                    <p
                      className="text-2xl font-extrabold"
                      style={{ color: "var(--color-cta-yellow)" }}
                    >
                      Rs. {order.total}
                    </p>
                  </div>
                </div>

                {/* Items list */}
                {order.items && order.items.length > 0 ? (
                  <div className="divide-y divide-[var(--color-surface-variant)]">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 px-5 py-3"
                      >
                        {/* Thumbnail */}
                        <img
                          src={item.image_path || "/images/placeholder.jpg"}
                          alt={item.name}
                          className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[var(--color-surface-variant)]"
                        />
                        {/* Name + price */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-[var(--color-on-surface)] truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                            Rs. {item.price} × {item.quantity}
                          </p>
                        </div>
                        {/* Line total */}
                        <p className="font-bold text-sm text-[var(--color-primary)] shrink-0">
                          Rs. {item.price * item.quantity}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-4 text-sm text-[var(--color-on-surface-variant)]">
                    Item details not available for this order.
                  </div>
                )}

                {/* Track button */}
                <div className="px-5 py-4 bg-[var(--color-surface-container-low)] flex justify-end">
                  <Link
                    href={`/orders/${order.orderNumber}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-bold hover:bg-[var(--color-primary-container)] transition-colors custom-shadow"
                  >
                    <span className="material-symbols-outlined text-[18px]">map</span>
                    Track Order
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
