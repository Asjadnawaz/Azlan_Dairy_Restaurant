import { redirect } from "next/navigation";

/**
 * /admin root — redirect to the orders dashboard.
 * Keeps the proxy's /admin/* guard happy and avoids a 404 when users
 * type /admin manually or land here after login.
 */
export default function AdminRootPage() {
  redirect("/admin/orders");
}
