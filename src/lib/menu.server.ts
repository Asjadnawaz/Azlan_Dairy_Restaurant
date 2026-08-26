import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Item } from "@/lib/supabase/database.types";
import { MENU_ITEMS } from "@/data/menu-data";

/**
 * Available menu items, deduplicated within a render pass.
 * Queries Supabase `items` table live and falls back to the bundled
 * `MENU_ITEMS` if the database is unreachable or unseeded.
 */
const FULL_MENU_THRESHOLD = 50;

export const getMenuItems = cache(async (): Promise<Item[]> => {
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
});

export function revalidateMenu(): void {
  // Direct read via React cache per render pass; no stale tag cache needed
}
