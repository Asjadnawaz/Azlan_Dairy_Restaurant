import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { syncUserProfile } from "@/lib/auth-role";

function safeRedirect(target: string, requestUrl: string) {
  const url = new URL(target, requestUrl);
  if (url.hostname === "0.0.0.0") {
    url.hostname = "localhost";
  }
  return NextResponse.redirect(url);
}

/**
 * Proxy (Next.js 16 — formerly "Middleware"):
 * 1. Refreshes the Supabase auth session on every request (handles token expiry).
 * 2. Syncs authenticated user to `public.profiles` database table.
 * 3. Enforces strict role-based access control (RBAC):
 *    - Admin accessing /rider -> redirected to /admin/orders
 *    - Rider accessing /admin -> redirected to /rider
 *    - Customer/Unauthenticated accessing /admin or /rider -> redirected to /
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
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
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session tokens & fetch current authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isRiderRoute = pathname.startsWith("/rider");

  if (!isAdminRoute && !isRiderRoute) {
    return response;
  }

  // Unauthenticated user attempting to access protected routes -> redirect to homepage
  if (!user) {
    return safeRedirect("/", request.url);
  }

  // Fetch role from public.profiles and sync user if not already in DB
  const role = await syncUserProfile(user);

  // Protected Route Redirection Rules:
  // 1. Admin accessing /rider -> Redirect to /admin/orders
  if (isRiderRoute && role === "admin") {
    return safeRedirect("/admin/orders", request.url);
  }

  // 2. Rider accessing /admin -> Redirect to /rider
  if (isAdminRoute && role === "rider") {
    return safeRedirect("/rider", request.url);
  }

  // 3. Customer accessing /admin or /rider -> Redirect to /
  if (role === "customer") {
    return safeRedirect("/", request.url);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/rider/:path*"],
};
