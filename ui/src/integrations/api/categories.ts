import { apiClient, queryClient } from '@/utils/orpc';
import { useMutation, useQuery } from '@tanstack/react-query';
import { categoryKeys } from './keys';
import type { Category } from './keys';

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.list(),
    queryFn: async () => {
      const data = await apiClient.getCategories();
      return data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useCreateCategory() {
  return useMutation({
    mutationFn: (input: { name: string; slug: string; description?: string }) =>
      apiClient.createCategory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

export function useDeleteCategory() {
  return useMutation({
    mutationFn: ({ id }: { id: string }) => apiClient.deleteCategory({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export type { Category };

