import { createPluginRuntime } from 'every-plugin';
import { ContractRouterClient } from 'every-plugin/orpc';
import { FulfillmentContract } from './services/fulfillment';
import GelatoPlugin from './services/fulfillment/gelato';
import PrintfulPlugin from './services/fulfillment/printful';
import { ReturnAddress } from './schema';

export interface FulfillmentConfig {
  printful?: {
    apiKey: string;
    storeId: string;
    webhookSecret?: string;
  };
  gelato?: {
    apiKey: string;
    webhookSecret: string;
    returnAddress?: ReturnAddress;
  };
}

export interface FulfillmentProvider {
  name: string;
  client: ContractRouterClient<typeof FulfillmentContract>
  router: any;
}

export async function createMarketplaceRuntime(config: FulfillmentConfig) {
  const runtime = createPluginRuntime({
    registry: {
      printful: { module: PrintfulPlugin },
      gelato: { module: GelatoPlugin },
    },
    secrets: {},
  });

  const providers: FulfillmentProvider[] = [];

  if (config.printful?.apiKey && config.printful?.storeId) {
    try {
      const printful = await runtime.usePlugin('printful', {
        variables: {
          baseUrl: 'https://api.printful.com',
        },
        secrets: {
          PRINTFUL_API_KEY: config.printful.apiKey,
          PRINTFUL_STORE_ID: config.printful.storeId,
          PRINTFUL_WEBHOOK_SECRET: config.printful.webhookSecret,
        },
      });
      providers.push({
        name: 'printful',
        client: printful.createClient(),
        router: printful.router,
      });
      console.log('[MarketplaceRuntime] Printful provider initialized');
    } catch (error) {
      console.error('[MarketplaceRuntime] Failed to initialize Printful:', error);
    }
  }

  if (config.gelato?.apiKey && config.gelato?.webhookSecret) {
    try {
      const gelato = await runtime.usePlugin('gelato', {
        variables: {
          baseUrl: 'https://order.gelatoapis.com/v4',
          returnAddress: config.gelato.returnAddress,
        },
        secrets: {
          GELATO_API_KEY: config.gelato.apiKey,
          GELATO_WEBHOOK_SECRET: config.gelato.webhookSecret,
        },
      });
      providers.push({
        name: 'gelato',
        client: gelato.createClient(),
        router: gelato.router,
      });
      console.log('[MarketplaceRuntime] Gelato provider initialized');
    } catch (error) {
      console.error('[MarketplaceRuntime] Failed to initialize Gelato:', error);
    }
  }

  console.log(`[MarketplaceRuntime] Enabled providers: ${providers.map((p) => p.name).join(', ') || 'none'}`);

  return {
    providers,
    getProvider: (name: string) => providers.find((p) => p.name === name) ?? null,
    shutdown: () => runtime.shutdown(),
  } as const;
}

export type MarketplaceRuntime = Awaited<ReturnType<typeof createMarketplaceRuntime>>;
