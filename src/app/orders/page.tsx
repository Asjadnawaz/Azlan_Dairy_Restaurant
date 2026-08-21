"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart-store";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Order, OrderItem as DatabaseOrderItem } from "@/lib/supabase/database.types";
import { toast } from "sonner";

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
  status?: string;
  id?: string;
  customer_name?: string;
  customer_address?: string;
  subtotal?: number;
  delivery_fee?: number;
}

type DatabaseOrderWithItems = Order & {
  order_items: Pick<DatabaseOrderItem, "id" | "name_snapshot" | "price_snapshot" | "quantity">[] | null;
};

export default function OrdersPage() {
  const cart = useCart();
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<StoredOrder | null>(null);

  useEffect(() => {
    async function loadOrders() {
      setLoading(true);

      // 1. Load local storage orders
      let localOrders: StoredOrder[] = [];
      try {
        const stored = localStorage.getItem("azlan-orders");
        if (stored) localOrders = JSON.parse(stored);
      } catch {
        localOrders = [];
      }

      // 2. Query /api/orders for latest order data & statuses
      try {
        const localNumbers = localOrders.map((o) => o.orderNumber).filter(Boolean);
        const queryUrl =
          localNumbers.length > 0
            ? `/api/orders?numbers=${encodeURIComponent(localNumbers.join(","))}`
            : `/api/orders`;

        const res = await fetch(queryUrl);
        if (res.ok) {
          const data = await res.json();
          const dbOrders: DatabaseOrderWithItems[] = data.orders || [];

          if (dbOrders && dbOrders.length > 0) {
            const merged: StoredOrder[] = dbOrders.map((o) => {
              const items: OrderItem[] = (o.order_items || []).map((item) => ({
                id: item.id,
                name: item.name_snapshot,
                price: item.price_snapshot,
                quantity: item.quantity,
                image_path: null,
              }));

              // Match local storage to preserve image previews if available
              const localMatch = localOrders.find(
                (l) => l.orderNumber === o.order_number || l.id === o.id
              );
              if (localMatch?.items) {
                items.forEach((it) => {
                  const lm = localMatch.items?.find(
                    (i) => i.name === it.name || i.id === it.id
                  );
                  if (lm?.image_path) it.image_path = lm.image_path;
                });
              }

              return {
                id: o.id,
                orderNumber: o.order_number,
                phone: o.customer_phone || localMatch?.phone || "",
                total: o.total,
                subtotal: o.subtotal,
                delivery_fee: o.delivery_fee,
                timestamp: new Date(o.placed_at || o.created_at).getTime(),
                items: items.length > 0 ? items : localMatch?.items || [],
                status: o.status || "pending",
                customer_name: o.customer_name,
                customer_address: o.customer_address,
              };
            });

            setOrders(merged.slice(0, 10));
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error("Error fetching live orders:", e);
      }

      // Fallback to local storage if DB query yields no results
      setOrders(localOrders.slice(0, 10));
      setLoading(false);
    }

    loadOrders();
  }, []);

  const handleReorder = (order: StoredOrder) => {
    if (!order.items || order.items.length === 0) {
      toast.error("No items found in this order to reorder.");
      return;
    }

    order.items.forEach((item) => {
      cart.add(
        {
          id: item.id || item.name,
          name: item.name,
          price: item.price,
          image_path: item.image_path || "/images/placeholder.jpg",
        },
        item.quantity
      );
    });

    toast.success(`Items from Order #${order.orderNumber} added to cart!`);
    cart.open();
  };

  const isCompleted = (status?: string) => {
    if (!status) return false;
    const s = status.toLowerCase();
    return s === "completed" || s === "complete" || s === "delivered";
  };

  const getStatusBadge = (status?: string) => {
    const s = (status || "pending").toLowerCase();
    if (s === "completed" || s === "complete" || s === "delivered") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          <span className="material-symbols-outlined text-[14px]">check_circle</span>
          Complete
        </span>
      );
    }
    if (s === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30">
          <span className="material-symbols-outlined text-[14px]">cancel</span>
          Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
        <span className="material-symbols-outlined text-[14px]">timelapse</span>
        In Progress
      </span>
    );
  };

  const displayOrders = orders.slice(0, 10);

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
              Your {displayOrders.length} most recent order{displayOrders.length !== 1 ? "s" : ""} from Azlan Fast Food & BBQ Point
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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="material-symbols-outlined text-[48px] animate-spin text-[var(--color-primary)]">
              sync
            </span>
            <p className="mt-3 text-sm text-[var(--color-on-surface-variant)] font-medium">
              Loading recent orders...
            </p>
          </div>
        ) : displayOrders.length === 0 ? (
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
          <div className="space-y-6">
            {displayOrders.map((order) => {
              const completed = isCompleted(order.status);
              return (
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
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-mint-accent)]">
                          Order
                        </span>
                        {getStatusBadge(order.status)}
                      </div>
                      <span className="text-lg font-extrabold text-white tracking-tight mt-0.5">
                        #{order.orderNumber}
                      </span>
                      <span className="text-xs text-white/60">
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
                      {order.items.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="flex items-center gap-3 px-5 py-3"
                        >
                          <Image
                            src={item.image_path || "/images/placeholder.jpg"}
                            alt={item.name}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[var(--color-surface-variant)]"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-[var(--color-on-surface)] truncate">
                              {item.name}
                            </p>
                            <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                              Rs. {item.price} × {item.quantity}
                            </p>
                          </div>
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

                  {/* Card Actions: Invoice & Reorder if Complete; Track Order if In Progress */}
                  <div className="px-5 py-4 bg-[var(--color-surface-container-low)] flex items-center justify-end gap-3">
                    {completed ? (
                      <>
                        <button
                          onClick={() => setSelectedInvoice(order)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)] text-xs font-bold hover:bg-[var(--color-primary)] hover:text-white transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                          Invoice
                        </button>
                        <button
                          onClick={() => handleReorder(order)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold hover:bg-[var(--color-primary-container)] transition-colors custom-shadow"
                        >
                          <span className="material-symbols-outlined text-[16px]">refresh</span>
                          Reorder
                        </button>
                      </>
                    ) : (
                      <Link
                        href={`/orders/${order.orderNumber}`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-sm font-bold hover:bg-[var(--color-primary-container)] transition-colors custom-shadow"
                      >
                        <span className="material-symbols-outlined text-[18px]">map</span>
                        Track Order
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] rounded-3xl max-w-xl w-full border border-[var(--color-surface-variant)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Invoice Header */}
            <div className="px-6 py-5 bg-[var(--color-primary)] text-white flex items-center justify-between border-b border-white/10">
              <div>
                <p className="text-xs uppercase tracking-widest text-[var(--color-mint-accent)] font-bold">Official Invoice</p>
                <h2 className="text-xl font-black tracking-tight">AZLAN FAST FOOD & BBQ POINT</h2>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-white text-[20px]">close</span>
              </button>
            </div>

            {/* Invoice Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-sm">
              <div className="flex flex-col sm:flex-row justify-between gap-4 pb-4 border-b border-[var(--color-surface-variant)]">
                <div>
                  <p className="text-xs text-[var(--color-on-surface-variant)] uppercase font-semibold">Order Number</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">#{selectedInvoice.orderNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-on-surface-variant)] uppercase font-semibold">Date & Time</p>
                  <p className="font-semibold">
                    {new Date(selectedInvoice.timestamp).toLocaleString("en-PK", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-on-surface-variant)] uppercase font-semibold">Status</p>
                  <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    PAID / COMPLETE
                  </span>
                </div>
              </div>

              {selectedInvoice.customer_name && (
                <div className="bg-[var(--color-surface-container-low)] p-3.5 rounded-xl space-y-1 border border-[var(--color-surface-variant)]">
                  <p className="font-bold text-xs uppercase text-[var(--color-on-surface-variant)]">Customer Information</p>
                  <p className="font-semibold">{selectedInvoice.customer_name}</p>
                  {selectedInvoice.phone && <p className="text-xs text-[var(--color-on-surface-variant)]">Phone: {selectedInvoice.phone}</p>}
                  {selectedInvoice.customer_address && <p className="text-xs text-[var(--color-on-surface-variant)]">Address: {selectedInvoice.customer_address}</p>}
                </div>
              )}

              {/* Items Table */}
              <div>
                <p className="font-bold text-xs uppercase tracking-wider text-[var(--color-on-surface-variant)] mb-2">Item Breakdown</p>
                <div className="border border-[var(--color-surface-variant)] rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-[var(--color-surface-container-low)] text-xs font-bold uppercase border-b border-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)]">
                      <tr>
                        <th className="py-2.5 px-3">Item</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Price</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-surface-variant)]">
                      {(selectedInvoice.items || []).map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-3 font-medium">{item.name}</td>
                          <td className="py-2.5 px-3 text-center text-xs font-bold">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-right text-xs">Rs. {item.price}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-xs">Rs. {item.price * item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="border-t border-[var(--color-surface-variant)] pt-3 space-y-1.5 text-xs">
                {selectedInvoice.subtotal !== undefined && (
                  <div className="flex justify-between text-[var(--color-on-surface-variant)]">
                    <span>Subtotal</span>
                    <span className="font-medium text-[var(--color-on-surface)]">Rs. {selectedInvoice.subtotal}</span>
                  </div>
                )}
                {selectedInvoice.delivery_fee !== undefined && selectedInvoice.delivery_fee > 0 && (
                  <div className="flex justify-between text-[var(--color-on-surface-variant)]">
                    <span>Delivery Fee</span>
                    <span className="font-medium text-[var(--color-on-surface)]">Rs. {selectedInvoice.delivery_fee}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-base pt-2 border-t border-[var(--color-surface-variant)] text-[var(--color-primary)]">
                  <span>Total Amount Paid</span>
                  <span style={{ color: "var(--color-cta-yellow)" }}>Rs. {selectedInvoice.total}</span>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-[var(--color-surface-container-low)] border-t border-[var(--color-surface-variant)] flex items-center justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold hover:bg-[var(--color-primary-container)] transition-colors custom-shadow"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                Print Invoice
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-5 py-2.5 rounded-full bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)] text-xs font-bold hover:bg-[var(--color-surface-variant)] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
