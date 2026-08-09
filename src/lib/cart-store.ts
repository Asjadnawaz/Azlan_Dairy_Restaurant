import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image_path: string;
  quantity: number;
};

export type CartState = {
  items: CartItem[];
  isOpen: boolean;
  step: "cart" | "checkout";
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  remove: (id: string) => void;
  updateQty: (id: string, delta: number) => void;
  setQty: (id: string, quantity: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setStep: (step: "cart" | "checkout") => void;
  totalItems: () => number;
  totalPrice: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      step: "cart",
      _hasHydrated: false,
      setHasHydrated: (v: boolean) => set({ _hasHydrated: v }),

      add: (item, quantity = 1) => {
        const existing = get().items.find((i) => i.id === item.id);
        let items: CartItem[];
        if (existing) {
          items = get().items.map((i) =>
            i.id === item.id
              ? { ...i, quantity: i.quantity + quantity }
              : i
          );
        } else {
          items = [...get().items, { ...item, quantity }];
        }
        set({ items, isOpen: true, step: "cart" });
      },

      remove: (id) =>
        set({
          items: get().items.filter((i) => i.id !== id),
          isOpen:
            get().items.filter((i) => i.id !== id).length === 0
              ? false
              : get().isOpen,
        }),

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
              ? get().items.map((i) =>
                  i.id === id ? { ...i, quantity } : i
                )
              : get().items.filter((i) => i.id !== id),
        }),

      clear: () => set({ items: [], isOpen: false, step: "cart" }),

      open: () => set({ isOpen: true, step: "cart" }),

      close: () => set({ isOpen: false, step: "cart" }),

      toggle: () =>
        set({
          isOpen: !get().isOpen,
          step: "cart" as const,
        }),

      setStep: (step) => set({ step }),

      totalItems: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),

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
