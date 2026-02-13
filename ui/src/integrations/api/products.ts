import { apiClient } from '@/utils/orpc';
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
  type QueryClient,
} from '@tanstack/react-query';
import { productKeys, productTypeKeys, collectionKeys, categoryKeys, type Category } from './keys';
import { toast } from 'sonner';

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

  prefetchFeatured: async (qc: QueryClient, limit = 8) => {
    await qc.prefetchQuery(productLoaders.featured(limit));
  },

  prefetchProduct: async (qc: QueryClient, id: string) => {
    await qc.prefetchQuery(productLoaders.detail(id));
  },

  prefetchList: async (
    qc: QueryClient,
    options?: {
      productTypeSlug?: string;
      collectionSlugs?: string[];
      tags?: string[];
      featured?: boolean;
      limit?: number;
      offset?: number;
    },
  ) => {
    await qc.prefetchQuery(productLoaders.list(options));
  },

  prefetchSearch: async (qc: QueryClient, query: string, options?: { limit?: number }) => {
    await qc.prefetchQuery(productLoaders.search(query, options));
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.sync(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: productKeys.syncStatus() });
      queryClient.invalidateQueries({ 
        queryKey: productKeys.all,
        refetchType: 'all'
      });
      queryClient.invalidateQueries({ queryKey: collectionKeys.all });
      queryClient.invalidateQueries({ queryKey: productTypeKeys.all });
      
      if (data.status === 'completed' && data.syncDuration) {
        const minutes = Math.floor(data.syncDuration / 60);
        const seconds = data.syncDuration % 60;
        toast.success(`Sync completed in ${minutes}m ${seconds}s`);
      } else if (data.status === 'completed') {
        toast.success('Sync completed');
      }
    },
    onError: (error) => {
      const errorCode = (error as any)?.response?.data?.code;
      const errorMessage = (error as any)?.message || 'Sync failed';
      
      switch (errorCode) {
        case 'SYNC_IN_PROGRESS': {
          const retryAfter = ((error as any)?.response?.data?.retryAfter ?? (error as any)?.response?.data?.duration) || 0;
          const timeLabel = retryAfter > 60
            ? `${Math.ceil(retryAfter / 60)}m ${retryAfter % 60}s`
            : `${retryAfter}s`;
          toast.error(`Sync is already in progress${retryAfter ? `, will retry in ${timeLabel}` : ''}`);
          break;
        }

        case 'SYNC_TIMEOUT': {
          toast.error('Sync timed out, please try again');
          break;
        }

        case 'SYNC_PROVIDER_ERROR': {
          const provider = (error as any)?.response?.data?.provider || 'Fulfillment provider';
          const retryAfter = (error as any)?.response?.data?.retryAfter;
          toast.error(`${provider}暂时不可用${retryAfter ? `, retry in ${retryAfter}s` : ''}`, {
            id: 'sync-provider-error',
            action: retryAfter ? {
              label: 'Retry',
              onClick: () => {
                if (retryAfter > 0 && retryAfter < 60) {
                  toast.promise(apiClient.sync(), {
                    loading: 'Retrying sync...',
                    success: 'Sync complete',
                    error: 'Sync failed',
                  });
                }
              },
            } : undefined,
          });
          break;
        }

        case 'SYNC_FAILED': {
          toast.error(errorMessage || 'Sync operation failed', {
            id: 'sync-failed',
            action: {
              label: 'Retry',
              onClick: () => toast.promise(apiClient.sync(), {
                loading: 'Retrying sync...',
                success: 'Sync complete',
                error: 'Sync failed',
              }),
            },
          });
          break;
        }

        default: {
          toast.error(errorMessage || 'An error occurred while syncing');
        }
      }
    },
  });
}

export function useUpdateProductListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, listed }: { id: string; listed: boolean }) =>
      apiClient.updateProductListing({ id, listed }),
    onMutate: async ({ id, listed }) => {
      await queryClient.cancelQueries({ queryKey: productKeys.all });

      const previousProducts = queryClient.getQueriesData({ queryKey: productKeys.all });
      
      queryClient.setQueriesData(
        { 
          predicate: (query) => 
            query.queryKey[0] === 'products' &&
            query.state.status === 'success'
        },
        (old: any) => {
          if (!old) return old;
          if (old.products) {
            return {
              ...old,
              products: old.products.map((p: Product) =>
                p.id === id ? { ...p, listed } : p
              ),
            };
          }
          if (old.product && old.product.id === id) {
            return {
              ...old,
              product: {
                ...old.product,
                listed,
              },
            };
          }
          return old;
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
      toast.error('Failed to update listing status');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useUpdateProductCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, categoryIds }: { id: string; categoryIds: string[] }) =>
      apiClient.updateProductCategories({ id, categoryIds }),
    onMutate: async ({ id, categoryIds }) => {
      await queryClient.cancelQueries({ queryKey: productKeys.all });
      const previousProducts = queryClient.getQueriesData({ queryKey: productKeys.all });

      const categoriesData = queryClient.getQueryData(categoryKeys.list()) as
        | { categories: Category[] }
        | undefined;

      queryClient.setQueriesData(
        { 
          predicate: (query) => 
            query.queryKey[0] === 'products' && 
            query.state.status === 'success'
        },
        (old: any) => {
          if (!old) return old;

          const toCollection = (slug: string, existing?: any) => {
            if (existing) return existing;
            const cat = categoriesData?.categories?.find((c) => c.slug === slug);
            return {
              slug,
              name: cat?.name ?? slug,
              showInCarousel: true,
              carouselOrder: 0,
            };
          };

          if (old.products) {
            return {
              ...old,
              products: old.products.map((p: Product) =>
                p.id === id 
                  ? { 
                      ...p, 
                      collections: (categoryIds as string[]).map((slug) =>
                        toCollection(slug, p.collections?.find((c: any) => c.slug === slug))
                      )
                    } 
                  : p
              ),
            };
          }

          if (old.product && old.product.id === id) {
            const p = old.product as Product;
            return {
              ...old,
              product: {
                ...p,
                collections: (categoryIds as string[]).map((slug) =>
                  toCollection(slug, p.collections?.find((c: any) => c.slug === slug))
                ),
              },
            };
          }

          return old;
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
      toast.error('Failed to update collections', {
        description: 'An unknown error occurred'
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: collectionKeys.all });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onSuccess: () => {
      toast.success('Collections updated successfully');
    },
  });
}

export function useUpdateProductTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, tags }: { id: string; tags: string[] }) =>
      apiClient.updateProductTags({ id, tags }),
    onMutate: async ({ id, tags }) => {
      await queryClient.cancelQueries({ queryKey: productKeys.all });
      const previousProducts = queryClient.getQueriesData({ queryKey: productKeys.all });

      queryClient.setQueriesData(
        { 
          predicate: (query) => 
            query.queryKey[0] === 'products' &&
            query.state.status === 'success'
        },
        (old: any) => {
          if (!old) return old;
          if (old.products) {
            return {
              ...old,
              products: old.products.map((p: Product) =>
                p.id === id ? { ...p, tags } : p
              ),
            };
          }
          if (old.product && old.product.id === id) {
            return {
              ...old,
              product: {
                ...old.product,
                tags,
              },
            };
          }
          return old;
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
      toast.error('Failed to update tags', {
        description: 'An unknown error occurred'
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
    onSuccess: () => {
      toast.success('Tags updated successfully');
    },
  });
}

export function useUpdateProductFeatured() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
      apiClient.updateProductFeatured({ id, featured }),
    onMutate: async ({ id, featured }) => {
      await queryClient.cancelQueries({ queryKey: productKeys.all });
      const previousProducts = queryClient.getQueriesData({ queryKey: productKeys.all });

      queryClient.setQueriesData(
        { 
          predicate: (query) => 
            query.queryKey[0] === 'products' &&
            query.state.status === 'success'
        },
        (old: any) => {
          if (!old) return old;
          if (old.products) {
            return {
              ...old,
              products: old.products.map((p: Product) =>
                p.id === id ? { ...p, featured } : p
              ),
            };
          }
          if (old.product && old.product.id === id) {
            return {
              ...old,
              product: {
                ...old.product,
                featured,
              },
            };
          }
          return old;
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
      toast.error('Failed to update featured status', {
        description: 'An unknown error occurred'
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
    onSuccess: (_, { featured }) => {
      const status = featured ? 'featured' : 'unfeatured';
      toast.success(`Product ${status} successfully`);
    },
  });
}

export function useUpdateProductType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, productTypeSlug }: { id: string; productTypeSlug: string | null }) =>
      apiClient.updateProductType({ id, productTypeSlug }),
    onMutate: async ({ id, productTypeSlug }) => {
      await queryClient.cancelQueries({ queryKey: productKeys.all });
      const previousProducts = queryClient.getQueriesData({ queryKey: productKeys.all });

      queryClient.setQueriesData(
        { 
          predicate: (query) => 
            query.queryKey[0] === 'products' && 
            query.state.status === 'success'
        },
        (old: any) => {
          if (!old) return old;
          if (old.products) {
            return {
              ...old,
              products: old.products.map((p: Product) =>
                p.id === id 
                  ? { 
                      ...p, 
                      productType: productTypeSlug ? { 
                        slug: productTypeSlug,
                        label: productTypeSlug,
                        displayOrder: 0,
                      } : null
                    } 
                  : p
              ),
            };
          }
          if (old.product && old.product.id === id) {
            const p = old.product as Product;
            return {
              ...old,
              product: {
                ...p,
                productType: productTypeSlug
                  ? {
                      slug: productTypeSlug,
                      label: productTypeSlug,
                      displayOrder: 0,
                    }
                  : null,
              },
            };
          }
          return old;
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { slug: string; label: string; description?: string; displayOrder?: number }) =>
      apiClient.createProductType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productTypeKeys.all });
    },
  });
}

export function useUpdateProductTypeItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, ...data }: { slug: string; label?: string; description?: string; displayOrder?: number }) =>
      apiClient.updateProductTypeItem({ slug, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productTypeKeys.all });
    },
  });
}

export function useDeleteProductType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slug }: { slug: string }) =>
      apiClient.deleteProductType({ slug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productTypeKeys.all });
    },
  });
}
