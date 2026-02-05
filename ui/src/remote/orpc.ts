
import { createORPCClient, onError } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { ContractRouterClient } from '@orpc/contract';
import { QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { contract } from '../../../api/src/contract';
import { getApiBaseUrl } from './runtime';

export type ApiContract = typeof contract;
export type ApiClient = ContractRouterClient<ApiContract>;

declare global {
  var $apiClient: ApiClient | undefined;
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: () => { },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error) => {
        // this needs better parity with the api behavior (oRPC Error and Effect)
        if (error && typeof error === 'object' && 'message' in error) {
          const message = String(error.message).toLowerCase();
          if (message.includes('fetch') || message.includes('network')) {
            return false;
          }
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

function createApiLink() {
  let apiUrl = getApiBaseUrl();
  
  return new RPCLink({
    url: apiUrl,
    interceptors: [
      onError((error: unknown) => {
        console.group('🔴 oRPC API Error - Full Debug');
        
        console.log('Raw error:', error);
        console.log('typeof:', typeof error);
        console.log('constructor:', error?.constructor?.name);
        
        if (error && typeof error === 'object') {
          console.log('Object.keys():', Object.keys(error));
          console.log('Object.getOwnPropertyNames():', Object.getOwnPropertyNames(error));
          
          const possibleProps = ['code', 'message', 'status', 'data', 'cause', 'stack', 'name', 'statusCode'];
          const extracted: Record<string, any> = {};
          
          for (const prop of possibleProps) {
            try {
              const value = (error as any)[prop];
              if (value !== undefined) {
                extracted[prop] = value;
                console.log(`  ${prop}:`, value);
              }
            } catch (e) {
              console.log(`  Error accessing ${prop}:`, e);
            }
          }
          
          console.log('Extracted properties:', extracted);
          
          try {
            const stringified = JSON.stringify(error, (key, value) => {
              if (value instanceof Error) {
                const errorObj: Record<string, any> = {
                  name: value.name,
                  message: value.message,
                  stack: value.stack,
                };
                for (const prop of Object.getOwnPropertyNames(value)) {
                  if (!(prop in errorObj)) {
                    errorObj[prop] = (value as any)[prop];
                  }
                }
                return errorObj;
              }
              return value;
            }, 2);
            console.log('JSON.stringify:', stringified);
          } catch (e) {
            console.log('JSON.stringify failed:', e);
          }
          
          let proto = Object.getPrototypeOf(error);
          let depth = 0;
          console.log('Prototype chain:');
          while (proto && depth < 5) {
            console.log(`  [${depth}] ${proto.constructor?.name}`, Object.getOwnPropertyNames(proto));
            proto = Object.getPrototypeOf(proto);
            depth++;
          }
        }
        
        console.groupEnd();

        if (error && typeof error === 'object' && 'message' in error) {
          const message = String(error.message).toLowerCase();
          if (message.includes('fetch') || message.includes('network') || message.includes('failed to fetch')) {
            toast.error('Unable to connect to API', {
              id: 'api-connection-error',
              description: 'The API is currently unavailable. Please try again later.',
            });
          }
        }
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

function createClientSideApiClient(): ApiClient {
  return createORPCClient(createApiLink());
}

export const apiClient: ApiClient = globalThis.$apiClient ?? createClientSideApiClient();

export const API_URL = typeof window !== 'undefined' ? `${window.location.origin}/api/rpc` : '/api/rpc';
