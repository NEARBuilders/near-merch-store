import { useState, useEffect, useCallback, useRef } from 'react';
import { useProductsByIds } from '@/integrations/marketplace-api';
import { toast } from 'sonner';

const FAVORITES_STORAGE_KEY = 'marketplace-favorites';

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });
  const lastToastRef = useRef<{ productId: string; timestamp: number } | null>(null);

  useEffect(() => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  const { data: favorites, isLoading } = useProductsByIds(favoriteIds);

  const toggleFavorite = useCallback((productId: string, productName?: string) => {
    const now = Date.now();
    const shouldShowToast = 
      !lastToastRef.current || 
      lastToastRef.current.productId !== productId || 
      now - lastToastRef.current.timestamp > 100;

    setFavoriteIds((prev) => {
      const isCurrentlyFavorite = prev.includes(productId);
      if (!isCurrentlyFavorite && productName && shouldShowToast) {
        lastToastRef.current = { productId, timestamp: now };
        toast.success(`${productName} added to favorites!`);
      }
      if (isCurrentlyFavorite) {
        return prev.filter((id) => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  }, []);

  const addFavorite = useCallback((productId: string, productName?: string) => {
    const now = Date.now();
    const shouldShowToast = 
      !lastToastRef.current || 
      lastToastRef.current.productId !== productId || 
      now - lastToastRef.current.timestamp > 100;

    setFavoriteIds((prev) => {
      if (prev.includes(productId)) return prev;
      if (productName && shouldShowToast) {
        lastToastRef.current = { productId, timestamp: now };
        toast.success(`${productName} added to favorites!`);
      }
      return [...prev, productId];
    });
  }, []);

  const removeFavorite = useCallback((productId: string) => {
    setFavoriteIds((prev) => prev.filter((id) => id !== productId));
  }, []);

  const isFavorite = useCallback(
    (productId: string) => favoriteIds.includes(productId),
    [favoriteIds]
  );

  const clearFavorites = useCallback(() => {
    setFavoriteIds([]);
  }, []);

  return {
    favoriteIds,
    favorites,
    count: favoriteIds.length,
    isLoading,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    isFavorite,
    clearFavorites,
  };
}
