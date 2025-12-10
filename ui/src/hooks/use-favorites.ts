import { useState, useEffect, useCallback } from 'react';
import { useProductsByIds, type Product } from '@/integrations/marketplace-api';

const FAVORITES_STORAGE_KEY = 'marketplace-favorites';

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  const { data: favorites, isLoading } = useProductsByIds(favoriteIds);

  const toggleFavorite = useCallback((productId: string) => {
    setFavoriteIds((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      }
      return [...prev, productId];
    });
  }, []);

  const addFavorite = useCallback((productId: string) => {
    setFavoriteIds((prev) => {
      if (prev.includes(productId)) return prev;
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
