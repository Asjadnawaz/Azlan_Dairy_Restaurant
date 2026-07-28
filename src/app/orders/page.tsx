"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface StoredOrder {
  orderNumber: string;
  phone: string;
  total: number;
  timestamp: number;
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
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--color-primary)]">
              My Orders
            </h1>
            <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">
              Track and view your recent orders
            </p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 rounded-full bg-[var(--color-surface-container)] text-sm font-semibold hover:bg-[var(--color-surface-container-highest)] transition-colors"
          >
            Back to Menu
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-[64px] text-[var(--color-on-surface-variant)]/40">
              shopping_bag
            </span>
            <p className="mt-4 font-semibold">No orders yet</p>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
              Your recent orders will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.orderNumber + order.timestamp}
                className="bg-[var(--color-surface-container-lowest)] rounded-[var(--radius-2xl)] border border-[var(--color-surface-variant)] p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-[var(--color-on-surface-variant)]">Order #{order.orderNumber}</p>
                    <p className="text-lg font-extrabold text-[var(--color-primary)]">
                      Rs. {order.total}
                    </p>
                    <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">
                      {new Date(order.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Link
                    href={`/orders/${order.orderNumber}`}
                    className="px-4 py-2 rounded-full bg-[var(--color-primary)] text-white text-sm font-bold hover:bg-[var(--color-primary-container)] transition-colors"
                  >
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
