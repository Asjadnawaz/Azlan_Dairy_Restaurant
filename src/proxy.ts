import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin";

/**
 * Proxy (Next.js 16 — formerly "Middleware"):
 * 1. Refreshes the Supabase auth session on every request (handles token expiry).
 * 2. Protects /admin/* routes — strictly checks Supabase authenticated user's role.
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

  // Refresh session tokens & get verified user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isAdminRoute = pathname.startsWith("/admin");

  // Strict RBAC: Check if current authenticated user has Admin rights
  const isUserAdmin = isAdminUser(user);

  // If attempting to access admin route without admin privileges -> redirect to home
  if (isAdminRoute && !isUserAdmin) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const isRiderRoute = pathname.startsWith("/rider");
  const riderAuthCookie = request.cookies.get("rider_auth")?.value === "true";

  if (isRiderRoute && !riderAuthCookie && !isUserAdmin) {
    return NextResponse.redirect(new URL("/rider", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};

