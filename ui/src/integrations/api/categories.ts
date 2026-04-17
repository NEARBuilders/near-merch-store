import { apiClient } from '@/utils/orpc';
import { useQuery } from '@tanstack/react-query';
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

export type { Category };
