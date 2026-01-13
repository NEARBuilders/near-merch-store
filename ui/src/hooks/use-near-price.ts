import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/utils/orpc';

const FALLBACK_NEAR_PRICE = 3.5;

async function fetchNearPrice(): Promise<number> {
  const result = await apiClient.getNearPrice();
  return result.price;
}

/**
 * Hook for fetching the current NEAR price in USD.
 * Uses the server-side API which fetches from CoinGecko and caches the result.
 *
 * @returns NEAR price data and loading/error states
 */
export function useNearPrice() {
  const { data: nearPrice, isLoading, error } = useQuery({
    queryKey: ['nearPrice'],
    queryFn: fetchNearPrice,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  return {
    nearPrice: nearPrice ?? FALLBACK_NEAR_PRICE,
    isLoading,
    error,
    isFallback: !nearPrice && !isLoading,
  };
}
