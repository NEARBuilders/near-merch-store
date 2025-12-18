import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartItem } from "@/integrations/marketplace-api";
import { toast } from "sonner";

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
  addToCart: (productId: string, variantId?: string, size?: string) => void;
  updateQuantity: (productId: string, change: number) => void;
  updateSize: (productId: string, size: string) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;

  // Getters (computed values)
  getItem: (productId: string) => CartItem | undefined;
  getItemCount: () => number;
  getProductIds: () => string[];
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: {},

      addToCart: (productId: string, variantId?: string, size = "N/A") => {
        set((state) => {
          const existingItem = state.items[productId];

          return {
            items: {
              ...state.items,
              [productId]: {
                productId,
                variantId: variantId || existingItem?.variantId,
                quantity: (existingItem?.quantity || 0) + 1,
                size: existingItem?.size || size,
              },
            },
          };
        });
        toast.success("Added to cart");
      },

      updateQuantity: (productId: string, change: number) => {
        set((state) => {
          const current = state.items[productId];
          if (!current) return state;

          const newQuantity = current.quantity + change;

          if (newQuantity <= 0) {
            const { [productId]: _, ...rest } = state.items;
            return { items: rest };
          }

          return {
            items: {
              ...state.items,
              [productId]: { ...current, quantity: newQuantity },
            },
          };
        });
      },

      updateSize: (productId: string, size: string) => {
        set((state) => {
          const current = state.items[productId];
          if (!current) return state;

          return {
            items: {
              ...state.items,
              [productId]: { ...current, size },
            },
          };
        });
      },

      removeItem: (productId: string) => {
        set((state) => {
          const { [productId]: _, ...rest } = state.items;
          return { items: rest };
        });
        toast.success("Removed from cart");
      },

      clearCart: () => {
        set({ items: {} });
      },

      getItem: (productId: string) => {
        return get().items[productId];
      },

      getItemCount: () => {
        return Object.values(get().items).reduce(
          (sum, item) => sum + item.quantity,
          0
        );
      },

      getProductIds: () => {
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
