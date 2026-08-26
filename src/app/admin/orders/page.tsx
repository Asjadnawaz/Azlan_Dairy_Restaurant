import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { isAdminUser } from "@/lib/admin";
import { fetchAdminStats, type AdminStatsResult } from "@/lib/admin-stats.server";
import type { Order, OrderItem, Rider, Settings } from "@/lib/supabase/database.types";

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

  // Riders come along here instead of being fetched by every order card, and the
  // aggregates come with them so the dashboard paints its stat tiles on the first
  // render instead of firing /api/admin/stats from a mount effect. A failed
  // aggregate must not take the orders screen down with it, so it degrades to a
  // note and the client's own refresh path.
  const [
    { data: ordersData },
    { data: settingsData },
    { data: ridersData },
    statsResult,
  ] = await Promise.all([
    admin.from("orders").select("*").order("placed_at", { ascending: false }).limit(50),
    admin.from("settings").select("*").single(),
    admin.from("riders").select("*").order("name", { ascending: true }),
    fetchAdminStats().catch((err: unknown): AdminStatsResult | null => {
      console.error("Admin stats seed failed:", err);
      return null;
    }),
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
      initialRiders={(ridersData ?? []) as Rider[]}
      initialStats={statsResult?.stats ?? null}
      initialStatsTruncated={statsResult?.truncated ?? false}
      settings={(settingsData as Settings) ?? null}
      userEmail={user.email ?? "admin@azlandairy.com"}
      signOutButton={<SignOutButton tone="dark" />}
    />
  );
}
