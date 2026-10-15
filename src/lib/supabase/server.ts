import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

const ONE_MONTH_IN_SECONDS = 60 * 60 * 24 * 30;

/**
 * Server-side Supabase client for Server Components, Route Handlers,
 * and Server Actions. Reads/writes persistent auth session via cookies.
 */
export const createServerClient = async () => {
  const cookieStore = await cookies();

  return createSSRServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: {
      maxAge: ONE_MONTH_IN_SECONDS,
      path: "/",
      sameSite: "lax",
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, {
              ...options,
              maxAge: options?.maxAge ?? ONE_MONTH_IN_SECONDS,
              path: options?.path ?? "/",
              sameSite: options?.sameSite ?? "lax",
            })
          );
        } catch {
          // Called from a Server Component — set is not available.
        }
      },
    },
  });
};
