import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/utils/orpc';
import { orderKeys } from './keys';

// Shipping Address type
export interface ShippingAddress {
  companyName?: string;
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postCode: string;
  country: string;
  email: string;
  phone?: string;
}

// Shipping Rate type
export interface ShippingRate {
  id: string;
  name: string;
  rate: number;
  currency: string;
  minDeliveryDays?: number;
  maxDeliveryDays?: number;
}

// Quote Input type
export interface GetQuoteInput {
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
  }>;
  shippingAddress: ShippingAddress;
}

// Quote Output type
export interface GetQuoteOutput {
  shippingRates: ShippingRate[];
  subtotal: number;
  currency: string;
}

// Hook to get shipping quote
export function useGetShippingQuote() {
  return useMutation({
    mutationFn: async (params: GetQuoteInput): Promise<GetQuoteOutput> => {
      return await apiClient.getQuote(params);
    },
  });
}

export interface CreateCheckoutInput {
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
  }>;
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
