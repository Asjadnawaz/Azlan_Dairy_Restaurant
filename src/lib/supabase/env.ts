/**
 * True when the Supabase connection variables are present. Server-side reads
 * use this to degrade to their bundled defaults instead of throwing, so the
 * project still builds and prerenders on a fresh clone without a `.env`.
 */
export function hasSupabaseEnv(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Placeholders so client construction never throws on a fresh clone without a
 * `.env` (build/prerender). Every request path that needs a working connection
 * is guarded by `hasSupabaseEnv()` or fails gracefully at query time.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
