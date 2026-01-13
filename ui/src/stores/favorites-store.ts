import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { toast } from "sonner";

const FAVORITES_STORAGE_KEY = "marketplace-favorites";

interface FavoritesState {
    favoriteIds: string[];

    // Actions
    addFavorite: (productId: string, productName?: string) => void;
    removeFavorite: (productId: string) => void;
    toggleFavorite: (productId: string, productName?: string) => void;
    clearFavorites: () => void;

    // Getters
    isFavorite: (productId: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
    persist(
        (set, get) => ({
            favoriteIds: [],

            addFavorite: (productId: string, productName?: string) => {
                set((state: FavoritesState) => {
                    if (state.favoriteIds.includes(productId)) return state;
                    console.log('Adding favorite:', productId, productName);
                    if (productName) {
                        toast.success(`${productName} added to favorites!`);
                    }

                    return {
                        favoriteIds: [...state.favoriteIds, productId],
                    };
                });
            },

            removeFavorite: (productId: string) => {
                set((state: FavoritesState) => ({
                    favoriteIds: state.favoriteIds.filter((id) => id !== productId),
                }));
            },

            toggleFavorite: (productId: string, productName?: string) => {
                const state: FavoritesState = get();
                const isFav = state.favoriteIds.includes(productId);
                console.log('Toggling favorite:', productId, productName, isFav);
                if (isFav) {
                    get().removeFavorite(productId);
                    console.log('Removed favorite:', productId);
                } else {
                    get().addFavorite(productId, productName);
                    console.log('Added favorite:', productId);
                }
            },

            clearFavorites: () => {
                set({ favoriteIds: [] });
            },

            isFavorite: (productId: string) => {
                return get().favoriteIds.includes(productId);
            },
        }),
        {
            name: FAVORITES_STORAGE_KEY,
            storage: createJSONStorage(() => localStorage),
        }
    )
);
