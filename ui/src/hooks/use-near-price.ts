import { useQuery } from '@tanstack/react-query';

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=near&vs_currencies=usd';
const FALLBACK_NEAR_PRICE = 3.5; // Fallback price if API fails

interface CoinGeckoResponse {
  near: {
    usd: number;
  };
}

async function fetchNearPrice(): Promise<number> {
  const response = await fetch(COINGECKO_API_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch NEAR price');
  }
  const data: CoinGeckoResponse = await response.json();
  return data.near.usd;
}

/**
 * Hook for fetching the current NEAR price in USD from CoinGecko.
 * Caches the price for 60 seconds to avoid excessive API calls.
 *
 * @returns NEAR price data and loading/error states
 */
export function useNearPrice() {
  const { data: nearPrice, isLoading, error } = useQuery({
    queryKey: ['nearPrice'],
    queryFn: fetchNearPrice,
    staleTime: 60 * 1000, // Consider data fresh for 60 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
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
