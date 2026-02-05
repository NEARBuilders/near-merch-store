import { apiClient, queryClient } from '@/utils/orpc';
import { useMutation, useQueries, useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { productKeys, productTypeKeys } from './keys';

export type Product = Awaited<ReturnType<typeof apiClient.getProduct>>['product'];
export type ProductImage = Product['images'][number];

export function getPrimaryCategoryName(product: Product): string {
  return product.collections?.[0]?.name ?? '';
}

export function useProducts(options?: {
  productTypeSlug?: string;
  collectionSlugs?: string[];
  tags?: string[];
  featured?: boolean;
  limit?: number;
  offset?: number;
  includeUnlisted?: boolean;
}) {
  return useQuery({
    queryKey: productKeys.list({
      productTypeSlug: options?.productTypeSlug,
      collectionSlugs: options?.collectionSlugs,
      tags: options?.tags,
      featured: options?.featured,
      limit: options?.limit,
      offset: options?.offset,
      includeUnlisted: options?.includeUnlisted,
    }),
    queryFn: async () => {
      const data = await apiClient.getProducts({
        productTypeSlug: options?.productTypeSlug,
        collectionSlugs: options?.collectionSlugs,
        tags: options?.tags,
        featured: options?.featured,
        limit: options?.limit ?? 50,
        offset: options?.offset ?? 0,
        includeUnlisted: options?.includeUnlisted,
      });

      return data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: async () => {
      const data = await apiClient.getProduct({ id });
      return {
        product: data.product,
      };
    },
    enabled: !!id,
    placeholderData: (prev) => prev,
  });
}

export function useSuspenseProduct(id: string) {
  return useSuspenseQuery({
    queryKey: productKeys.detail(id),
    queryFn: async () => {
      const data = await apiClient.getProduct({ id });
      return {
        product: data.product
      };
    },
  });
}

export function useFeaturedProducts(limit = 12) {
  return useQuery({
    queryKey: productKeys.featured(limit),
    queryFn: async () => {
      const data = await apiClient.getFeaturedProducts({ limit });
      return data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useSuspenseFeaturedProducts(limit = 12) {
  return useSuspenseQuery({
    queryKey: productKeys.featured(limit),
    queryFn: async () => {
      const data = await apiClient.getFeaturedProducts({ limit });
      return data;
    },
  });
}

export function useSearchProducts(query: string, options?: {
  limit?: number;
}) {
  return useQuery({
    queryKey: productKeys.search(query, options?.limit),
    queryFn: async () => {
      const data = await apiClient.searchProducts({
        query,
        limit: options?.limit ?? 20,
      });
      return data;
    },
    enabled: query.length > 0,
  });
}

export function useSuspenseSearchProducts(query: string, options?: {
  limit?: number;
}) {
  return useSuspenseQuery({
    queryKey: productKeys.search(query, options?.limit),
    queryFn: async () => {
      const data = await apiClient.searchProducts({
        query,
        limit: options?.limit ?? 20,
      });
      return data;
    },
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

  list: (options?: { 
    productTypeSlug?: string;
    collectionSlugs?: string[];
    tags?: string[];
    featured?: boolean;
    limit?: number; 
    offset?: number;
  }) => ({
    queryKey: productKeys.list({
      productTypeSlug: options?.productTypeSlug,
      collectionSlugs: options?.collectionSlugs,
      tags: options?.tags,
      featured: options?.featured,
      limit: options?.limit,
      offset: options?.offset,
    }),
    queryFn: () =>
      apiClient.getProducts({
        productTypeSlug: options?.productTypeSlug,
        collectionSlugs: options?.collectionSlugs,
        tags: options?.tags,
        featured: options?.featured,
        limit: options?.limit ?? 50,
        offset: options?.offset ?? 0,
      }),
  }),

  search: (query: string, options?: { limit?: number }) => ({
    queryKey: productKeys.search(query, options?.limit),
    queryFn: () =>
      apiClient.searchProducts({
        query,
        limit: options?.limit ?? 50,
      }),
  }),

  prefetchFeatured: async (limit = 8) => {
    await queryClient.prefetchQuery(productLoaders.featured(limit));
  },

  prefetchProduct: async (id: string) => {
    await queryClient.prefetchQuery(productLoaders.detail(id));
  },

  prefetchList: async (options?: { 
    productTypeSlug?: string;
    collectionSlugs?: string[];
    tags?: string[];
    featured?: boolean;
    limit?: number; 
    offset?: number;
  }) => {
    await queryClient.prefetchQuery(productLoaders.list(options));
  },

  prefetchSearch: async (query: string, options?: { limit?: number }) => {
    await queryClient.prefetchQuery(productLoaders.search(query, options));
  },
};

export function useSyncStatus() {
  return useQuery({
    queryKey: productKeys.syncStatus(),
    queryFn: () => apiClient.getSyncStatus(),
    refetchInterval: (query) => {
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
      queryClient.invalidateQueries({ queryKey: productKeys.syncStatus() });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useUpdateProductListing() {
  return useMutation({
    mutationFn: ({ id, listed }: { id: string; listed: boolean }) =>
      apiClient.updateProductListing({ id, listed }),
    onMutate: async ({ id, listed }) => {
      await queryClient.cancelQueries({ queryKey: productKeys.all });

      const previousProducts = queryClient.getQueriesData({ queryKey: productKeys.lists() });

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
      if (context?.previousProducts) {
        context.previousProducts.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useUpdateProductCategories() {
  return useMutation({
    mutationFn: ({ id, categoryIds }: { id: string; categoryIds: string[] }) =>
      apiClient.updateProductCategories({ id, categoryIds }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: productKeys.all });
      const previousProducts = queryClient.getQueriesData({ queryKey: productKeys.lists() });
      return { previousProducts };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousProducts) {
        context.previousProducts.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useUpdateProductTags() {
  return useMutation({
    mutationFn: ({ id, tags }: { id: string; tags: string[] }) =>
      apiClient.updateProductTags({ id, tags }),
    onMutate: async ({ id, tags }) => {
      await queryClient.cancelQueries({ queryKey: productKeys.all });
      const previousProducts = queryClient.getQueriesData({ queryKey: productKeys.lists() });

      queryClient.setQueriesData(
        { queryKey: productKeys.lists() },
        (old: { products: Product[]; total: number } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            products: old.products.map((p) =>
              p.id === id ? { ...p, tags } : p
            ),
          };
        }
      );

      return { previousProducts };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousProducts) {
        context.previousProducts.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useUpdateProductFeatured() {
  return useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
      apiClient.updateProductFeatured({ id, featured }),
    onMutate: async ({ id, featured }) => {
      await queryClient.cancelQueries({ queryKey: productKeys.all });
      const previousProducts = queryClient.getQueriesData({ queryKey: productKeys.lists() });

      queryClient.setQueriesData(
        { queryKey: productKeys.lists() },
        (old: { products: Product[]; total: number } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            products: old.products.map((p) =>
              p.id === id ? { ...p, featured } : p
            ),
          };
        }
      );

      return { previousProducts };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousProducts) {
        context.previousProducts.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useUpdateProductType() {
  return useMutation({
    mutationFn: ({ id, productTypeSlug }: { id: string; productTypeSlug: string | null }) =>
      apiClient.updateProductType({ id, productTypeSlug }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: productKeys.all });
      const previousProducts = queryClient.getQueriesData({ queryKey: productKeys.lists() });
      return { previousProducts };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousProducts) {
        context.previousProducts.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export type ProductTypeData = Awaited<ReturnType<typeof apiClient.getProductTypes>>['productTypes'][number];

export function useProductTypes() {
  return useQuery({
    queryKey: productTypeKeys.list(),
    queryFn: async () => {
      const data = await apiClient.getProductTypes();
      return data;
    },
  });
}

export function useCreateProductType() {
  return useMutation({
    mutationFn: (data: { slug: string; label: string; description?: string; displayOrder?: number }) =>
      apiClient.createProductType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productTypeKeys.all });
    },
  });
}

export function useUpdateProductTypeItem() {
  return useMutation({
    mutationFn: ({ slug, ...data }: { slug: string; label?: string; description?: string; displayOrder?: number }) =>
      apiClient.updateProductTypeItem({ slug, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productTypeKeys.all });
    },
  });
}

export function useDeleteProductType() {
  return useMutation({
    mutationFn: ({ slug }: { slug: string }) =>
      apiClient.deleteProductType({ slug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productTypeKeys.all });
    },
  });
}
