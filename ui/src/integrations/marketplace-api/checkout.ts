import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/utils/orpc';
import { orderKeys } from './keys';

export interface CreateCheckoutInput {
  productId: string;
  quantity: number;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutOutput {
  checkoutSessionId: string;
  checkoutUrl: string;
  orderId: string;
}

export function useCreateCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateCheckoutInput): Promise<CreateCheckoutOutput> => {
      return await apiClient.createCheckout(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}
