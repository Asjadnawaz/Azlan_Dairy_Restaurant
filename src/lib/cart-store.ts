import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * The cart.
 *
 * Only `items` is persisted (see `partialize`) — the drawer-era `isOpen`/`step`
 * fields were removed along with `cart-drawer.tsx`: no drawer has been mounted
 * for a long time, so nothing read them, and `add()` setting `isOpen: true` did
 * nothing at all. Adding to the cart now surfaces the floating cart button
 * instead (src/components/azlan/floating-buttons.tsx).
 */

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image_path: string;
  quantity: number;
};

export type CartState = {
  items: CartItem[];
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  remove: (id: string) => void;
  updateQty: (id: string, delta: number) => void;
  setQty: (id: string, quantity: number) => void;
  clear: () => void;
  totalItems: () => number;
  totalPrice: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      _hasHydrated: false,
      setHasHydrated: (v: boolean) => set({ _hasHydrated: v }),

      add: (item, quantity = 1) => {
        const existing = get().items.find((i) => i.id === item.id);
        const items = existing
          ? get().items.map((i) =>
              i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
            )
          : [...get().items, { ...item, quantity }];
        set({ items });
      },

      remove: (id) => set({ items: get().items.filter((i) => i.id !== id) }),

      updateQty: (id, delta) =>
        set({
          items: get()
            .items.map((i) =>
              i.id === id ? { ...i, quantity: i.quantity + delta } : i
            )
            .filter((i) => i.quantity > 0),
        }),

      setQty: (id, quantity) =>
        set({
          items:
            quantity > 0
              ? get().items.map((i) => (i.id === id ? { ...i, quantity } : i))
              : get().items.filter((i) => i.id !== id),
        }),

      clear: () => set({ items: [] }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      totalPrice: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: "azlan-dairy-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
