import { createBrowserClient as createSSRBrowserClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

const ONE_MONTH_IN_SECONDS = 60 * 60 * 24 * 30;

/**
 * Browser-side Supabase client singleton using @supabase/ssr.
 * Configured with persistent 1-year cookies and auto-refresh token handling
 * so users remain logged in across tab closures and browser restarts.
 */
export const createBrowserClient = () =>
  createSSRBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: {
      maxAge: ONE_MONTH_IN_SECONDS,
      path: "/",
      sameSite: "lax",
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
