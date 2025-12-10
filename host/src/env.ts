import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.string().default('3001').transform(Number),
    API_PORT: z.string().default('3000').transform(Number),
    CORS_ORIGIN: z.string().optional(),

    // Add other secrets here as needed by plugins
    PRINTFUL_API_KEY: z.string().optional(),
    RELAYER_ACCOUNT_ID: z.string().optional(),
    RELAYER_PRIVATE_KEY: z.string().optional(),
    GELATO_API_KEY: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().optional()
    // REDIS_URL: z.string().optional(),
  },
  // TODO
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
