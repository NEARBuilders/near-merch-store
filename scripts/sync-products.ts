#!/usr/bin/env bun
import { Effect, Layer } from 'every-plugin/effect';
import * as dotenv from 'dotenv';
import path from 'path';
import { createMarketplaceRuntime } from '../api/src/runtime';
import { ProductService, ProductServiceLive } from '../api/src/services/products';
import { DatabaseLive, ProductStoreLive } from '../api/src/store';

// Load environment variables
dotenv.config();
// Also try to load from parent directories if not found (monorepo structure)
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), 'api', '.env') });

async function main() {
  const secrets = {
    PRINTFUL_API_KEY: process.env.PRINTFUL_API_KEY,
    PRINTFUL_STORE_ID: process.env.PRINTFUL_STORE_ID,
    GELATO_API_KEY: process.env.GELATO_API_KEY,
    GELATO_WEBHOOK_SECRET: process.env.GELATO_WEBHOOK_SECRET,
    API_DATABASE_URL: process.env.API_DATABASE_URL || 'file:./marketplace.db',
    API_DATABASE_AUTH_TOKEN: process.env.API_DATABASE_AUTH_TOKEN,
  };

  console.log('🔄 Initializing Product Sync CLI...');

  const runtime = await createMarketplaceRuntime(
    {
      printful: secrets.PRINTFUL_API_KEY && secrets.PRINTFUL_STORE_ID
        ? {
            apiKey: secrets.PRINTFUL_API_KEY,
            storeId: secrets.PRINTFUL_STORE_ID,
          }
        : undefined,
      gelato: secrets.GELATO_API_KEY && secrets.GELATO_WEBHOOK_SECRET
        ? {
            apiKey: secrets.GELATO_API_KEY,
            webhookSecret: secrets.GELATO_WEBHOOK_SECRET,
          }
        : undefined,
    },
    {}
  );

  const dbLayer = DatabaseLive(secrets.API_DATABASE_URL, secrets.API_DATABASE_AUTH_TOKEN);
  const appLayer = ProductServiceLive(runtime).pipe(
    Layer.provide(ProductStoreLive),
    Layer.provide(dbLayer)
  );

  const program = Effect.gen(function* () {
    const service = yield* ProductService;
    console.log('🚀 Starting synchronization...');
    const result = yield* service.sync();
    console.log(`✅ Sync completed: ${result.count} products synced.`);
    return result;
  }).pipe(Effect.provide(appLayer));

  try {
    await Effect.runPromise(program);
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  } finally {
    await runtime.shutdown();
  }
}

main();
