import { useQuery, useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, queryClient } from '@/utils/orpc';
import { collectionKeys } from './keys';

export type Collection = Awaited<ReturnType<typeof apiClient.getCollections>>['collections'][number];
export type CarouselCollection = Awaited<ReturnType<typeof apiClient.getCarouselCollections>>['collections'][number];

export function useCollections() {
  return useQuery({
    queryKey: collectionKeys.list(),
    queryFn: () => apiClient.getCollections(),
    placeholderData: (prev) => prev,
  });
}

export function useSuspenseCollections() {
  return useSuspenseQuery({
    queryKey: collectionKeys.list(),
    queryFn: () => apiClient.getCollections(),
  });
}

export function useCollection(slug: string) {
  return useQuery({
    queryKey: collectionKeys.detail(slug),
    queryFn: () => apiClient.getCollection({ slug }),
    enabled: !!slug,
    placeholderData: (prev) => prev,
  });
}

export function useSuspenseCollection(slug: string) {
  return useSuspenseQuery({
    queryKey: collectionKeys.detail(slug),
    queryFn: () => apiClient.getCollection({ slug }),
  });
}

export function useCarouselCollections() {
  return useQuery({
    queryKey: collectionKeys.carousel(),
    queryFn: () => apiClient.getCarouselCollections(),
    placeholderData: (prev) => prev,
  });
}

export function useSuspenseCarouselCollections() {
  return useSuspenseQuery({
    queryKey: collectionKeys.carousel(),
    queryFn: () => apiClient.getCarouselCollections(),
  });
}

export function useUpdateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { slug: string; name?: string; description?: string; carouselTitle?: string; carouselDescription?: string; showInCarousel?: boolean; carouselOrder?: number }) => 
      apiClient.updateCollection(data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: collectionKeys.list() });
      qc.invalidateQueries({ queryKey: collectionKeys.carousel() });
      qc.invalidateQueries({ queryKey: collectionKeys.detail(variables.slug) });
    },
  });
}

export function useUpdateCollectionFeaturedProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { slug: string; productId: string }) => 
      apiClient.updateCollectionFeaturedProduct(data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: collectionKeys.list() });
      qc.invalidateQueries({ queryKey: collectionKeys.carousel() });
      qc.invalidateQueries({ queryKey: collectionKeys.detail(variables.slug) });
    },
  });
}

export const collectionLoaders = {
  list: () => ({
    queryKey: collectionKeys.list(),
    queryFn: () => apiClient.getCollections(),
  }),

  carousel: () => ({
    queryKey: collectionKeys.carousel(),
    queryFn: () => apiClient.getCarouselCollections(),
  }),

  detail: (slug: string) => ({
    queryKey: collectionKeys.detail(slug),
    queryFn: () => apiClient.getCollection({ slug }),
  }),

  prefetchCollections: async () => {
    await queryClient.prefetchQuery(collectionLoaders.list());
  },

  prefetchCarouselCollections: async () => {
    await queryClient.prefetchQuery(collectionLoaders.carousel());
  },

  prefetchCollection: async (slug: string) => {
    await queryClient.prefetchQuery(collectionLoaders.detail(slug));
  },
};
