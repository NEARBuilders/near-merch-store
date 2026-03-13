import { createPlugin } from 'every-plugin';
import { Effect } from 'every-plugin/effect';
import { z } from 'every-plugin/zod';
import { ExclusiveCheckContract } from './contract';

const WhitelistPlugin = createPlugin({
  variables: z.object({}),

  secrets: z.object({}),

  contract: ExclusiveCheckContract,

  initialize: () =>
    Effect.gen(function* () {
      console.log('[Whitelist Plugin] Initialized successfully');
      return {};
    }),

  shutdown: () => Effect.void,

  createRouter: (_context, builder) => {
    return {
      checkAccess: builder.checkAccess.handler(async ({ input }) => {
        const { nearAccountId, config } = input;
        const allowedAccounts = config.allowedAccounts;

        if (!Array.isArray(allowedAccounts)) {
          return { hasAccess: false };
        }

        const normalizedId = nearAccountId.toLowerCase();
        const hasAccess = allowedAccounts.some(
          (account) => typeof account === 'string' && account.toLowerCase() === normalizedId
        );

        return { hasAccess };
      }),
    };
  },
});

export default WhitelistPlugin;
