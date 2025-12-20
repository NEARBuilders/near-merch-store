import { useProductsByIds } from '@/integrations/api';
import { useFavoritesStore } from '@/stores/favorites-store';

export function useFavorites() {
  const favoriteIds = useFavoritesStore((state) => state.favoriteIds);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const addFavorite = useFavoritesStore((state) => state.addFavorite);
  const removeFavorite = useFavoritesStore((state) => state.removeFavorite);
  const isFavorite = useFavoritesStore((state) => state.isFavorite);
  const clearFavorites = useFavoritesStore((state) => state.clearFavorites);

  const { data: favorites, isLoading } = useProductsByIds(favoriteIds);

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
