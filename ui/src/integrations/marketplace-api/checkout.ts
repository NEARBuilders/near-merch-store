import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/utils/orpc';

export type CreateCheckoutInput = {
  productId: string;
  quantity?: number;
  successUrl: string;
  cancelUrl: string;
};

export type CreateCheckoutOutput = Awaited<ReturnType<typeof apiClient.createCheckout>>;

export function useCreateCheckout() {
  return useMutation({
    mutationFn: (input: CreateCheckoutInput) =>
      apiClient.createCheckout({
        productId: input.productId,
        quantity: input.quantity ?? 1,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
      }),
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
  });
}
