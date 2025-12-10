import { useState, useEffect, useCallback } from 'react';
import {
  useProductsByIds,
  requiresSize,
  type Product,
  type CartItem,
} from '@/integrations/marketplace-api';

const CART_STORAGE_KEY = 'marketplace-cart';

export interface CartItemWithProduct extends CartItem {
  product: Product;
}

export function useCart() {
  const [items, setItems] = useState<Record<string, CartItem>>(() => {
    if (typeof window === 'undefined') return {};
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  });

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const productIds = Object.keys(items);
  const { data: products, isLoading } = useProductsByIds(productIds);

  const addToCart = useCallback((productId: string, size = 'N/A') => {
    setItems((prev) => ({
      ...prev,
      [productId]: {
        productId,
        quantity: (prev[productId]?.quantity || 0) + 1,
        size: prev[productId]?.size || size,
      },
    }));
  }, []);

  const updateQuantity = useCallback((productId: string, change: number) => {
    setItems((prev) => {
      const current = prev[productId];
      if (!current) return prev;

      const newQuantity = current.quantity + change;
      if (newQuantity <= 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [productId]: { ...current, quantity: newQuantity },
      };
    });
  }, []);

  const updateSize = useCallback((productId: string, size: string) => {
    setItems((prev) => {
      const current = prev[productId];
      if (!current) return prev;
      return {
        ...prev,
        [productId]: { ...current, size },
      };
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => {
      const { [productId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems({});
  }, []);

  const cartItems: CartItemWithProduct[] = products
    .map((product) => {
      const item = items[product.id];
      if (!item) return null;
      return { ...item, product };
    })
    .filter(Boolean) as CartItemWithProduct[];

  const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
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
