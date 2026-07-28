import { createBrowserClient as createSSRBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Browser-side Supabase client singleton using @supabase/ssr.
 * Handles auth session persistence via cookies automatically.
 * Used by Client Components for data fetching, realtime, auth, and mutations.
 */
export const createBrowserClient = () =>
  createSSRBrowserClient(supabaseUrl, supabaseAnonKey);
