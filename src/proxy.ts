import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin";

/**
 * Proxy (Next.js 16 — formerly "Middleware"):
 * 1. Refreshes the Supabase auth session on every request (handles token expiry).
 * 2. Protects /admin/* routes (except /admin/login) — redirects to /admin/login
 *    if no authenticated admin user.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll().map((c) => ({
            name: c.name,
            value: c.value,
          }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session tokens
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protect /admin routes (except the login page itself)
  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginRoute = pathname === "/admin/login";
  const adminAuthCookie = request.cookies.get("admin_auth")?.value === "true";
  const isUserAdmin = isAdminUser(user) || adminAuthCookie;

  if (isAdminRoute && !isLoginRoute && !isUserAdmin) {
    // Non-admin users (authenticated or not) are silently redirected to home
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If logged in as admin and visiting login page, redirect to dashboard
  if (isLoginRoute && isUserAdmin) {
    return NextResponse.redirect(new URL("/admin/orders", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
