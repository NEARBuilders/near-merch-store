import { oc } from 'every-plugin/orpc';
import { z } from 'every-plugin/zod';

export const ExclusiveCheckContract = oc.router({
  checkAccess: oc
    .route({
      method: 'POST',
      path: '/check-access',
      summary: 'Check exclusive access',
      description: 'Checks if a NEAR account has access to an exclusive collection.',
    })
    .input(z.object({
      nearAccountId: z.string(),
      config: z.record(z.string(), z.any()),
    }))
    .output(z.object({
      hasAccess: z.boolean(),
    })),
});

export type ExclusiveCheckContractType = typeof ExclusiveCheckContract;
