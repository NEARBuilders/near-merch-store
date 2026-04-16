import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/utils/orpc';
import { orderKeys } from './keys';

export type Order = Awaited<ReturnType<typeof apiClient.getOrder>>['order'];

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { orderId: string; status: Awaited<ReturnType<typeof apiClient.getAllOrders>>['orders'][0]['status']; reason?: string }) =>
      apiClient.updateOrderStatus(variables),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.all }),
        queryClient.invalidateQueries({ queryKey: orderKeys.auditLog(variables.orderId) }),
      ]);
    },
  });
}

const orderLoaders = {
  list: (options?: { limit?: number; offset?: number }) => ({
    queryKey: orderKeys.list({ limit: options?.limit, offset: options?.offset }),
    queryFn: () =>
      apiClient.getOrders({
        limit: options?.limit ?? 10,
        offset: options?.offset ?? 0,
      }),
  }),

  detail: (id: string) => ({
    queryKey: orderKeys.detail(id),
    queryFn: () => apiClient.getOrder({ id }),
  }),

  prefetchOrders: async (qc: QueryClient, options?: { limit?: number; offset?: number }) => {
    await qc.prefetchQuery(orderLoaders.list(options));
  },

  prefetchOrder: async (qc: QueryClient, id: string) => {
    await qc.prefetchQuery(orderLoaders.detail(id));
  },
};
