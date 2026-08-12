import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { isAdminUser } from "@/lib/admin";
import type { Order, OrderItem, Settings } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Strict Server-side RBAC check — non-admins are redirected to homepage
  if (!user || !isAdminUser(user)) {
    redirect("/");
  }

  // Use admin client (service role) to bypass RLS and fetch all orders
  const admin = createAdminClient();

  // Fetch recent orders with their line items
  const [{ data: ordersData }, { data: settingsData }] = await Promise.all([
    admin
      .from("orders")
      .select("*")
      .order("placed_at", { ascending: false })
      .limit(50),
    admin.from("settings").select("*").single(),
  ]);

  const orderIds = (ordersData ?? []).map((o) => o.id);

  let lineItems: OrderItem[] = [];
  if (orderIds.length > 0) {
    const { data: itemsData } = await admin
      .from("order_items")
      .select("*")
      .in("order_id", orderIds);
    lineItems = (itemsData ?? []) as OrderItem[];
  }

  const orders = (ordersData ?? []) as Order[];

  return (
    <AdminDashboard
      initialOrders={orders}
      initialLineItems={lineItems}
      settings={(settingsData as Settings) ?? null}
      userEmail={user.email ?? "admin@azlandairy.com"}
      signOutButton={<SignOutButton />}
    />
  );
}

