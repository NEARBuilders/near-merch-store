import { apiClient } from '@/utils/orpc';
import { useMutation } from '@tanstack/react-query';

export type SubscribeNewsletterOutput = Awaited<ReturnType<typeof apiClient.subscribeNewsletter>>;

export function useSubscribeNewsletter() {
  return useMutation({
    mutationFn: async ({ email }: { email: string }): Promise<SubscribeNewsletterOutput> => {
      return await apiClient.subscribeNewsletter({ email });
    },
  });
}
