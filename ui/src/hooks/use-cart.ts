import { useMemo } from "react";
import {
  useProductsByIds,
  requiresSize,
  type Product,
  type CartItem,
} from "@/integrations/marketplace-api";
import { useCartStore } from "@/stores/cart-store";

export interface CartItemWithProduct extends CartItem {
  product: Product;
}

/**
 * Hook for accessing and managing cart state.
 * Uses Zustand for performant state management with localStorage persistence.
 *
 * @returns Cart state and actions
 */
export function useCart() {
  // Get cart state from Zustand store
  const items = useCartStore((state) => state.items);
  const addToCart = useCartStore((state) => state.addToCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const updateSize = useCartStore((state) => state.updateSize);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  // Get product IDs and fetch product data
  const productIds = useMemo(() => Object.keys(items), [items]);
  const { data: products, isLoading } = useProductsByIds(productIds);

  // Memoize cart items with product data
  const cartItems: CartItemWithProduct[] = useMemo(() => {
    return products
      .map((product) => {
        const item = items[product.id];
        if (!item) return null;
        return { ...item, product };
      })
      .filter(Boolean) as CartItemWithProduct[];
  }, [products, items]);

  // Memoize computed values
  const totalCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      ),
    [cartItems]
  );

  return {
    items,
    cartItems,
    totalCount,
    subtotal,
    isLoading,
    addToCart,
    updateQuantity,
    updateSize,
    removeItem,
    clearCart,
    requiresSize,
  };
}
