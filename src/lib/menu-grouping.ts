import type { Item } from "@/lib/supabase/database.types";

/**
 * Matches common size designations in parentheses at the end of item names.
 * e.g., "Vegetable Pizza (Small)", "Bbq Tikka Pizza (Regular)", "Crermi Pizza (Large)"
 */
export const SIZE_REGEX = /\s*\((small|regular|medium|large|extra large|half|full|mini|jumbo)\)\s*$/i;

export interface GroupedMenuItem {
  /** The primary item representing this group (defaulting to first or lowest-price variant) */
  item: Item;
  /** Clean base display name without the "(Size)" suffix */
  displayName: string;
  /** All size variants belonging to this group, sorted by price ascending */
  variants?: Item[];
  /** Minimum price among variants (e.g., 300) */
  minPrice: number;
  /** Maximum price among variants (e.g., 800) */
  maxPrice: number;
  /** True if this item has multiple size variants */
  hasSizes: boolean;
}

/**
 * Extracts the clean base name of an item (e.g. "Vegetable Pizza" from "Vegetable Pizza (Small)").
 */
export function getBaseItemName(name: string): string {
  return name.replace(SIZE_REGEX, "").trim();
}

/**
 * Extracts the size string from an item name (e.g. "Small" from "Vegetable Pizza (Small)").
 */
export function getItemSizeLabel(item: Item): string {
  const match = item.name.match(/\(([^)]+)\)$/);
  return match ? match[1].trim() : "Standard";
}

/**
 * Groups items that share the same base name and have size indicators into a single card entry.
 */
export function groupMenuItems(items: Item[]): GroupedMenuItem[] {
  const result: GroupedMenuItem[] = [];
  const map = new Map<string, GroupedMenuItem>();

  for (const item of items) {
    const match = item.name.match(SIZE_REGEX);
    if (!match) {
      // Standard item without size parentheses
      result.push({
        item,
        displayName: item.name,
        minPrice: item.price,
        maxPrice: item.price,
        hasSizes: false,
      });
      continue;
    }

    const baseName = getBaseItemName(item.name);
    const groupKey = `${item.category.toLowerCase()}:${baseName.toLowerCase()}`;

    let group = map.get(groupKey);
    if (!group) {
      group = {
        item,
        displayName: baseName,
        variants: [item],
        minPrice: item.price,
        maxPrice: item.price,
        hasSizes: false, // will update below once we see multiple variants
      };
      map.set(groupKey, group);
      result.push(group);
    } else {
      group.variants!.push(item);
      group.minPrice = Math.min(group.minPrice, item.price);
      group.maxPrice = Math.max(group.maxPrice, item.price);
      // Sort variants by price ascending (Small -> Regular -> Large)
      group.variants!.sort((a, b) => a.price - b.price);
      // Use the first (lowest price) variant as the default
      group.item = group.variants![0];
    }
  }

  // Update hasSizes flag for groups that actually contain multiple variants
  for (const group of result) {
    if (group.variants && group.variants.length > 1) {
      group.hasSizes = true;
    }
  }

  return result;
}
