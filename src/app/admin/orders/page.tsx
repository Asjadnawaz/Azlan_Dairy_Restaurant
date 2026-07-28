import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { SignOutButton } from "@/components/admin/sign-out-button";
import type { Order, OrderItem, Settings } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const supabase = await createServerClient();

  // Double-check auth server-side (middleware also guards this)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/admin/login");
  }

  // Fetch recent orders with their line items
  const [{ data: ordersData }, { data: settingsData }] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("settings").select("*").single(),
  ]);

  const orderIds = (ordersData ?? []).map((o) => o.id);

  let lineItems: OrderItem[] = [];
  if (orderIds.length > 0) {
    const { data: itemsData } = await supabase
      .from("order_items")
      .select("*")
      .in("order_id", orderIds)
      .order("sort_order", { ascending: true });
    lineItems = (itemsData ?? []) as OrderItem[];
  }

  const orders = (ordersData ?? []) as Order[];

  return (
    <AdminDashboard
      initialOrders={orders}
      initialLineItems={lineItems}
      settings={(settingsData as Settings) ?? null}
      userEmail={user.email ?? "admin"}
      signOutButton={<SignOutButton />}
    />
  );
}
