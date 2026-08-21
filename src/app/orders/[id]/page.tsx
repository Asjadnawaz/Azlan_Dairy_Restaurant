import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { OrderTracker } from "@/components/azlan/order-tracker";
import type { Order, OrderItem } from "@/lib/supabase/database.types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OrderPage({ params }: Props) {
  const { id: orderId } = await params;
  const admin = createAdminClient();

  // Support looking up by either DB ID or order number (case-insensitive or exact)
  const orderQuery = admin
    .from("orders")
    .select(`
      *,
      order_items (
        id,
        name_snapshot,
        price_snapshot,
        quantity,
        line_total
      )
    `);

  const isUuid = /^[0-9a-f-]{36}$/i.test(orderId);
  const { data: order, error } = isUuid
    ? await orderQuery.eq("id", orderId).maybeSingle()
    : await orderQuery.ilike("order_number", orderId).maybeSingle();

  if (error || !order) {
    console.error("Order fetch error:", error);
    notFound();
  }

  // Fetch settings for store info
  const { data: settings } = await admin
    .from("settings")
    .select("*")
    .single();

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <OrderTracker
        order={order as Order}
        items={(order.order_items || []) as OrderItem[]}
        settings={settings}
      />
    </div>
  );
}
