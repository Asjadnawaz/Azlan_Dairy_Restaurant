"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-store";
import type { Order, OrderItem as DatabaseOrderItem } from "@/lib/supabase/database.types";
import { readLocalOrders, type StoredOrder } from "@/lib/reviews-local";
import { printInvoice } from "@/lib/invoice-print";
import { OrderHistoryCard } from "@/components/orders/order-history-card";
import { InvoiceModal } from "@/components/orders/invoice-modal";
import { toast } from "sonner";

type DatabaseOrderWithItems = Order & {
  order_items:
    | Pick<
        DatabaseOrderItem,
        "id" | "item_id" | "name_snapshot" | "price_snapshot" | "quantity"
      >[]
    | null;
};

export default function OrdersPage() {
  const cart = useCart();
  const router = useRouter();
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<StoredOrder | null>(null);

  useEffect(() => {
    async function loadOrders() {
      setLoading(true);

      // 1. Load local storage orders
      const localOrders = readLocalOrders();

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
              const items: NonNullable<StoredOrder["items"]> = (o.order_items || []).map(
                (item) => ({
                  id: item.item_id || item.id,
                  name: item.name_snapshot,
                  price: item.price_snapshot,
                  quantity: item.quantity,
                  image_path: null,
                })
              );

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
          image_path: item.image_path ?? "",
        },
        item.quantity
      );
    });

    toast.success(`Items from Order #${order.orderNumber} added to cart!`);
    router.push("/cart");
  };

  /**
   * Link into the tracker. The tracking page gates order-number lookups behind
   * the last four digits of the phone (an order number is guessable); if we have
   * the uuid we use that instead, which needs no gate, and otherwise pre-fill the
   * check from the phone we stored at checkout so the customer isn't asked twice.
   */
  const trackHref = (order: StoredOrder) => {
    if (order.id) return `/orders/${order.id}`;
    const last4 = (order.phone || "").replace(/\D/g, "").slice(-4);
    return last4
      ? `/orders/${order.orderNumber}?p=${last4}`
      : `/orders/${order.orderNumber}`;
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
            {displayOrders.map((order) => (
              <OrderHistoryCard
                key={(order.orderNumber ?? "") + (order.timestamp ?? 0)}
                order={order}
                trackHref={trackHref(order)}
                onInvoice={() => setSelectedInvoice(order)}
                onReorder={() => handleReorder(order)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {selectedInvoice && (
        <InvoiceModal
          order={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onPrint={() => printInvoice(selectedInvoice)}
        />
      )}
    </div>
  );
}
