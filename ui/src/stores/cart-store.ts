import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartItem } from "@/integrations/api";

const CART_STORAGE_KEY = "marketplace-cart";

/**
 * Cart store state interface
 *
 * This store manages cart items with automatic localStorage persistence.
 * Actions are pure functions that update the state immutably.
 */
interface CartState {
  items: Record<string, CartItem>;

  // Actions
  addToCart: (productId: string, variantId: string, size: string, color: string, imageUrl?: string) => void;
  updateQuantity: (variantId: string, change: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;

  // Getters (computed values)
  getItem: (variantId: string) => CartItem | undefined;
  getItemCount: () => number;
  getVariantIds: () => string[];
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: {},

      addToCart: (productId: string, variantId: string, size: string, color: string, imageUrl?: string) => {
        set((state) => {
          const existingItem = state.items[variantId];

          return {
            items: {
              ...state.items,
              [variantId]: {
                productId,
                variantId,
                quantity: (existingItem?.quantity || 0) + 1,
                size,
                color,
                imageUrl: imageUrl || existingItem?.imageUrl,
              },
            },
          };
        });
      },

      updateQuantity: (variantId: string, change: number) => {
        set((state) => {
          const current = state.items[variantId];
          if (!current) return state;

          const newQuantity = current.quantity + change;

          if (newQuantity <= 0) {
            const { [variantId]: _, ...rest } = state.items;
            return { items: rest };
          }

          return {
            items: {
              ...state.items,
              [variantId]: { ...current, quantity: newQuantity },
            },
          };
        });
      },

      removeItem: (variantId: string) => {
        set((state) => {
          const { [variantId]: _, ...rest } = state.items;
          return { items: rest };
        });
      },

      clearCart: () => {
        set({ items: {} });
      },

      getItem: (variantId: string) => {
        return get().items[variantId];
      },

      getItemCount: () => {
        return Object.values(get().items).reduce(
          (sum, item) => sum + item.quantity,
          0
        );
      },

      getVariantIds: () => {
        return Object.keys(get().items);
      },
    }),
    {
      name: CART_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist the items, not the functions
      partialize: (state) => ({ items: state.items }),
    }
  )
);
