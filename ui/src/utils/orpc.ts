import { createORPCClient, onError } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import { QueryCache, QueryClient } from '@tanstack/react-query';
import type { ContractRouterClient } from '@orpc/contract';
import type { contract } from '../../../api/src/contract';

export const API_URL = `${window.location.origin}/api/rpc`;

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: () => {},
  }),
  defaultOptions: { queries: { staleTime: 60 * 1000 } },
});

function createApiLink() {
  return new RPCLink({
    url: API_URL,
    interceptors: [
      onError((error: unknown) => {
        console.error('oRPC API Error:', error);
      }),
    ],
    fetch(url, options) {
      return fetch(url, {
        ...options,
        credentials: 'include',
      });
    },
  });
}

export type ApiContract = typeof contract;
export type ApiClient = ContractRouterClient<ApiContract>;

export const apiClient: ApiClient = createORPCClient(createApiLink());
