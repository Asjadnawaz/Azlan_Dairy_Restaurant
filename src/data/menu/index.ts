import type { Item } from "@/lib/supabase/database.types";
import { DEALS_ITEMS } from "./deals";
import { BURGERS_ITEMS } from "./burgers";
import { SANDWICHES_ITEMS } from "./sandwiches";
import { BROAST_ITEMS } from "./broast";
import { ROLLS_ITEMS } from "./rolls";
import { FRIES_ITEMS } from "./fries";
import { PARATHAS_ITEMS } from "./parathas";
import { PIZZAS_ITEMS } from "./pizzas";

/**
 * Bundled fallback menu. The live source of truth is the Supabase `items`
 * table; these rows only render when the database is unreachable or unseeded
 * (see lib/menu.server.ts), and they seed the table via scripts/sync-items.mjs.
 */
export const MENU_ITEMS: Item[] = [
  ...DEALS_ITEMS,
  ...BURGERS_ITEMS,
  ...SANDWICHES_ITEMS,
  ...BROAST_ITEMS,
  ...ROLLS_ITEMS,
  ...FRIES_ITEMS,
  ...PARATHAS_ITEMS,
  ...PIZZAS_ITEMS,
];
