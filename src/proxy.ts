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
 *    - Customer accessing /admin or /rider -> redirected to /
 *    - Unauthenticated -> /rider shows its own login screen, everything else to /
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

  // Unauthenticated:
  //  - /rider renders its own sign-in screen, so let it through. Bouncing it home
  //    left the rider on the customer homepage with no way in — their bookmark,
  //    and every session expiry, dead-ended there.
  //  - Deeper rider pages have no sign-in of their own, so they go to /rider.
  //  - /admin has no self-service sign-in screen, so it still goes home.
  //
  // Nothing is exposed by letting /rider render: the page shows only the login
  // form until a session exists, and all data comes from /api/rider/orders,
  // which re-checks the role server-side on every call.
  if (!user) {
    if (pathname === "/rider") return response;
    if (isRiderRoute) return safeRedirect("/rider", request.url);
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
