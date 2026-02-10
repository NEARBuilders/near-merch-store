import {
  useQuery,
  useSuspenseQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { apiClient } from '@/utils/orpc';
import { collectionKeys } from './keys';
import { toast } from 'sonner';

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
    onMutate: async (variables) => {
      await qc.cancelQueries({ queryKey: collectionKeys.list() });
      await qc.cancelQueries({ queryKey: collectionKeys.carousel() });
      await qc.cancelQueries({ queryKey: collectionKeys.detail(variables.slug) });

      const previousList = qc.getQueryData(collectionKeys.list());
      const previousCarousel = qc.getQueryData(collectionKeys.carousel());
      const previousDetail = qc.getQueryData(collectionKeys.detail(variables.slug));

      qc.setQueryData(collectionKeys.list(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          collections: old.collections.map((c: Collection) =>
            c.slug === variables.slug
              ? { ...c, name: variables.name ?? c.name, description: variables.description ?? c.description, carouselTitle: variables.carouselTitle ?? c.carouselTitle, carouselDescription: variables.carouselDescription ?? c.carouselDescription, showInCarousel: variables.showInCarousel ?? c.showInCarousel, carouselOrder: variables.carouselOrder ?? c.carouselOrder }
              : c
          )
        };
      });

      qc.setQueryData(collectionKeys.detail(variables.slug), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          name: variables.name ?? old.name,
          description: variables.description ?? old.description,
          carouselTitle: variables.carouselTitle ?? old.carouselTitle,
          carouselDescription: variables.carouselDescription ?? old.carouselDescription,
          showInCarousel: variables.showInCarousel ?? old.showInCarousel,
          carouselOrder: variables.carouselOrder ?? old.carouselOrder
        };
      });

      qc.setQueryData(collectionKeys.carousel(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          collections: old.collections.map((c: any) =>
            c.slug === variables.slug
              ? { ...c, name: variables.name ?? c.name, carouselTitle: variables.carouselTitle ?? c.carouselTitle, carouselDescription: variables.carouselDescription ?? c.carouselDescription, showInCarousel: variables.showInCarousel ?? c.showInCarousel, carouselOrder: variables.carouselOrder ?? c.carouselOrder }
              : c
          )
        };
      });

      return { previousList, previousCarousel, previousDetail, slug: variables.slug };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousList) {
        qc.setQueryData(collectionKeys.list(), context.previousList);
      }
      if (context?.previousCarousel) {
        qc.setQueryData(collectionKeys.carousel(), context.previousCarousel);
      }
      if (context?.previousDetail) {
        qc.setQueryData(collectionKeys.detail(context.slug), context.previousDetail);
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: collectionKeys.all });
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: collectionKeys.carousel() });
      qc.invalidateQueries({ queryKey: collectionKeys.detail(variables.slug) });
      toast.success('Collection updated successfully');
    },
    onSettled: (_, _variables, context) => {
      qc.invalidateQueries({ queryKey: collectionKeys.all });
      qc.invalidateQueries({ queryKey: collectionKeys.carousel() });
      qc.invalidateQueries({ queryKey: collectionKeys.detail(context?.slug || '') });
    },
  });
}

export function useUpdateCollectionFeaturedProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { slug: string; productId: string | '' }) =>
      apiClient.updateCollectionFeaturedProduct({
        slug: data.slug,
        productId: data.productId || null
      }),
    onMutate: async (variables) => {
      await qc.cancelQueries({ queryKey: collectionKeys.list() });
      await qc.cancelQueries({ queryKey: collectionKeys.carousel() });
      await qc.cancelQueries({ queryKey: collectionKeys.detail(variables.slug) });

      const previousList = qc.getQueryData(collectionKeys.list());
      const previousCarousel = qc.getQueryData(collectionKeys.carousel());
      const previousDetail = qc.getQueryData(collectionKeys.detail(variables.slug));

      qc.setQueryData(collectionKeys.list(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          collections: old.collections.map((c: Collection) =>
            c.slug === variables.slug
              ? { ...c, featuredProduct: variables.productId ? { id: variables.productId, title: 'Updating...', thumbnailImage: '', price: 0 } : null }
              : c
          )
        };
      });

      qc.setQueryData(collectionKeys.detail(variables.slug), (old: any) => {
        if (!old) return old;
        const targetProduct = variables.productId ? old.products?.find((p: any) => p.id === variables.productId) : null;
        return {
          ...old,
          products: old.products?.map((p: any) =>
            p.id === variables.productId ? { ...p, featured: !!variables.productId } : { ...p, featured: false }
          ),
          featuredProduct: targetProduct || null
        };
      });

      return { previousList, previousCarousel, previousDetail, slug: variables.slug };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousList) {
        qc.setQueryData(collectionKeys.list(), context.previousList);
      }
      if (context?.previousCarousel) {
        qc.setQueryData(collectionKeys.carousel(), context.previousCarousel);
      }
      if (context?.previousDetail) {
        qc.setQueryData(collectionKeys.detail(context.slug), context.previousDetail);
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: collectionKeys.list() });
      qc.invalidateQueries({ queryKey: collectionKeys.carousel() });
      qc.invalidateQueries({ queryKey: collectionKeys.detail(variables.slug) });
      toast.success('Featured product updated successfully');
    },
    onSettled: (_, _variables, context) => {
      qc.invalidateQueries({ queryKey: collectionKeys.list() });
      qc.invalidateQueries({ queryKey: collectionKeys.carousel() });
      qc.invalidateQueries({ queryKey: collectionKeys.detail(context?.slug || '') });
    },
  });
}

export function useCreateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; slug: string; description?: string }) =>
      apiClient.createCategory(input),
    onMutate: async (variables) => {
      await qc.cancelQueries({ queryKey: collectionKeys.list() });

      const previousList = qc.getQueryData(collectionKeys.list());

      qc.setQueryData(collectionKeys.list(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          collections: [...old.collections, { slug: variables.slug, name: variables.name, description: variables.description, showInCarousel: false, carouselOrder: 0, carouselTitle: variables.name, carouselDescription: '', featuredProduct: undefined, image: undefined, badge: undefined, features: undefined } as unknown as Collection]
        };
      });

      return { previousList };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousList) {
        qc.setQueryData(collectionKeys.list(), context.previousList);
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: collectionKeys.all });
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success(`Collection "${variables.name}" created successfully`);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: collectionKeys.all });
    },
  });
}

export function useDeleteCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => apiClient.deleteCategory({ id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: collectionKeys.all });
      qc.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Collection deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete collection', {
        description: error?.message || 'An unknown error occurred'
      });
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

  prefetchCollections: async (qc: QueryClient) => {
    await qc.prefetchQuery(collectionLoaders.list());
  },

  prefetchCarouselCollections: async (qc: QueryClient) => {
    await qc.prefetchQuery(collectionLoaders.carousel());
  },

  prefetchCollection: async (qc: QueryClient, slug: string) => {
    await qc.prefetchQuery(collectionLoaders.detail(slug));
  },
};
