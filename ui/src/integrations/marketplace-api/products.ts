import { useQuery, useSuspenseQuery, useQueries, useMutation } from '@tanstack/react-query';
import { apiClient, queryClient } from '@/utils/orpc';
import { productKeys, type ProductCategory } from './keys';

export type Product = Awaited<ReturnType<typeof apiClient.getProduct>>['product'];

export function useProducts(options?: {
  category?: ProductCategory;
  limit?: number;
  offset?: number;
  includeUnlisted?: boolean;
}) {
  return useQuery({
    queryKey: productKeys.list({
      category: options?.category,
      limit: options?.limit,
      offset: options?.offset,
      includeUnlisted: options?.includeUnlisted,
    }),
    queryFn: () =>
      apiClient.getProducts({
        category: options?.category,
        limit: options?.limit ?? 50,
        offset: options?.offset ?? 0,
        includeUnlisted: options?.includeUnlisted,
      }),
    placeholderData: (prev) => prev,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => apiClient.getProduct({ id }),
    enabled: !!id,
    placeholderData: (prev) => prev,
  });
}

export function useSuspenseProduct(id: string) {
  return useSuspenseQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => apiClient.getProduct({ id }),
  });
}

export function useFeaturedProducts(limit = 12) {
  return useQuery({
    queryKey: productKeys.featured(limit),
    queryFn: () => apiClient.getFeaturedProducts({ limit }),
    placeholderData: (prev) => prev,
  });
}

export function useSuspenseFeaturedProducts(limit = 12) {
  return useSuspenseQuery({
    queryKey: productKeys.featured(limit),
    queryFn: () => apiClient.getFeaturedProducts({ limit }),
  });
}

export function useSearchProducts(query: string, options?: {
  category?: ProductCategory;
  limit?: number;
}) {
  return useQuery({
    queryKey: productKeys.search(query, options?.category, options?.limit),
    queryFn: () =>
      apiClient.searchProducts({
        query,
        category: options?.category,
        limit: options?.limit ?? 20,
      }),
    enabled: query.length > 0,
  });
}

export function useSuspenseSearchProducts(query: string, options?: {
  category?: ProductCategory;
  limit?: number;
}) {
  return useSuspenseQuery({
    queryKey: productKeys.search(query, options?.category, options?.limit),
    queryFn: () =>
      apiClient.searchProducts({
        query,
        category: options?.category,
        limit: options?.limit ?? 20,
      }),
  });
}

export function useProductsByIds(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: productKeys.detail(id),
      queryFn: () => apiClient.getProduct({ id }),
      enabled: !!id,
    })),
    combine: (results) => ({
      data: results.map((r) => r.data?.product).filter(Boolean) as Product[],
      isLoading: results.some((r) => r.isLoading),
      isError: results.some((r) => r.isError),
    }),
  });
}

export const productLoaders = {
  featured: (limit = 12) => ({
    queryKey: productKeys.featured(limit),
    queryFn: () => apiClient.getFeaturedProducts({ limit }),
  }),

  detail: (id: string) => ({
    queryKey: productKeys.detail(id),
    queryFn: () => apiClient.getProduct({ id }),
  }),

  list: (options?: { category?: ProductCategory; limit?: number; offset?: number }) => ({
    queryKey: productKeys.list({
      category: options?.category,
      limit: options?.limit,
      offset: options?.offset,
    }),
    queryFn: () =>
      apiClient.getProducts({
        category: options?.category,
        limit: options?.limit ?? 50,
        offset: options?.offset ?? 0,
      }),
  }),

  search: (query: string, options?: { category?: ProductCategory; limit?: number }) => ({
    queryKey: productKeys.search(query, options?.category, options?.limit),
    queryFn: () =>
      apiClient.searchProducts({
        query,
        category: options?.category,
        limit: options?.limit ?? 50,
      }),
  }),

  prefetchFeatured: async (limit = 8) => {
    await queryClient.prefetchQuery(productLoaders.featured(limit));
  },

  prefetchProduct: async (id: string) => {
    await queryClient.prefetchQuery(productLoaders.detail(id));
  },

  prefetchList: async (options?: { category?: ProductCategory; limit?: number; offset?: number }) => {
    await queryClient.prefetchQuery(productLoaders.list(options));
  },

  prefetchSearch: async (query: string, options?: { category?: ProductCategory; limit?: number }) => {
    await queryClient.prefetchQuery(productLoaders.search(query, options));
  },
};

// Admin functions for sync and listing management
export function useSyncStatus() {
  return useQuery({
    queryKey: productKeys.syncStatus(),
    queryFn: () => apiClient.getSyncStatus(),
    refetchInterval: (query) => {
      // Poll every 2 seconds while syncing
      if (query.state.data?.status === 'running') {
        return 2000;
      }
      return false;
    },
  });
}

export function useSyncProducts() {
  return useMutation({
    mutationFn: () => apiClient.sync(),
    onSuccess: () => {
      // Invalidate sync status to trigger refetch
      queryClient.invalidateQueries({ queryKey: productKeys.syncStatus() });
      // Invalidate product lists to show new products
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useUpdateProductListing() {
  return useMutation({
    mutationFn: ({ id, listed }: { id: string; listed: boolean }) =>
      apiClient.updateProductListing({ id, listed }),
    onMutate: async ({ id, listed }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: productKeys.all });

      // Snapshot previous value
      const previousProducts = queryClient.getQueriesData({ queryKey: productKeys.lists() });

      // Optimistically update all product lists
      queryClient.setQueriesData(
        { queryKey: productKeys.lists() },
        (old: { products: Product[]; total: number } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            products: old.products.map((p) =>
              p.id === id ? { ...p, listed } : p
            ),
          };
        }
      );

      return { previousProducts };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousProducts) {
        context.previousProducts.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Refetch to ensure sync with server
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}
