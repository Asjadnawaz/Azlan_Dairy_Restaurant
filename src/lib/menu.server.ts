import { cache } from "react";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Item } from "@/lib/supabase/database.types";
import { MENU_ITEMS } from "@/data/menu";
import { hasSupabaseEnv } from "@/lib/supabase/env";

/**
 * Available menu items, deduplicated within a render pass.
 * Queries Supabase `items` table live and falls back to the bundled
 * `MENU_ITEMS` if the database is unreachable or unseeded.
 *
 * The read is tag-cached so the prerendered homepage can stay static between
 * edits; `revalidateMenu()` (called by every route that writes an item) drops
 * both the data cache and the page so a price change lands immediately.
 */
const FULL_MENU_THRESHOLD = 50;
const MENU_TTL_SECONDS = 60;

export const MENU_CACHE_TAG = "azlan-menu";

const loadMenuItems = unstable_cache(
  async (): Promise<Item[]> => {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("items")
        .select("*")
        .eq("is_available", true)
        .order("sort_order", { ascending: true });

      if (!error && data && data.length >= FULL_MENU_THRESHOLD) {
        return data as Item[];
      }
      if (error) {
        console.warn("Could not load items from Supabase, falling back to MENU_ITEMS:", error.message);
      }
    } catch (err) {
      console.warn("Exception querying Supabase items, falling back to MENU_ITEMS:", err);
    }

    return MENU_ITEMS;
  },
  ["azlan-menu-items"],
  { tags: [MENU_CACHE_TAG], revalidate: MENU_TTL_SECONDS }
);

export const getMenuItems = cache(async (): Promise<Item[]> => {
  if (!hasSupabaseEnv()) return MENU_ITEMS;
  return loadMenuItems();
});

/** Drop the cached menu and the prerendered homepage after an item write. */
export function revalidateMenu(): void {
  revalidateTag(MENU_CACHE_TAG, { expire: 0 });
  revalidatePath("/");
}
