import { createPluginRuntime } from 'every-plugin';
import { ContractRouterClient } from 'every-plugin/orpc';
import { FulfillmentContract } from './services/fulfillment';
import PrintfulPlugin from './services/fulfillment/printful';
import LuluPlugin from './services/fulfillment/lulu';
import type { LuluBookConfig } from './services/fulfillment/lulu/types';
import { PaymentContract } from './services/payment';
import PingPayPlugin from './services/payment/pingpay';
import StripePlugin from './services/payment/stripe';
import {
  ExclusiveCheckContract,
  LegionHolderPlugin,
  WhitelistPlugin,
} from './services/exclusive';
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
  lulu?: {
    clientKey: string;
    clientSecret: string;
    environment?: 'sandbox' | 'production';
    books?: LuluBookConfig[];
  };
}

export interface PaymentConfig {
  stripe?: {
    secretKey: string;
    webhookSecret: string;
  };
  ping?: {
    apiKey?: string;
    webhookSecret?: string;
  };
}

export interface ExclusiveCheckConfig {
  nodeUrl: string;
}

export interface FulfillmentProvider {
  name: string;
  client: ContractRouterClient<typeof FulfillmentContract>
  router: any;
}

export interface PaymentProvider {
  name: string;
  client: ContractRouterClient<typeof PaymentContract>;
  router: any;
}

export interface ExclusiveCheckProvider {
  name: string;
  client: ContractRouterClient<typeof ExclusiveCheckContract>;
  router: any;
}

export async function createMarketplaceRuntime(
  fulfillmentConfig: FulfillmentConfig,
  paymentConfig?: PaymentConfig,
  exclusiveCheckConfig?: ExclusiveCheckConfig,
): Promise<MarketplaceRuntime> {
  const runtime = createPluginRuntime({
    registry: {
      printful: { module: PrintfulPlugin },
      lulu: { module: LuluPlugin },
      stripe: { module: StripePlugin },
      pingpay: { module: PingPayPlugin },
      'legion-holder': { module: LegionHolderPlugin },
      whitelist: { module: WhitelistPlugin },
    },
    secrets: {},
  });

  const providers: FulfillmentProvider[] = [];
  const paymentProviders: PaymentProvider[] = [];
  const exclusiveCheckProviders: ExclusiveCheckProvider[] = [];

  if (fulfillmentConfig.printful?.apiKey && fulfillmentConfig.printful?.storeId) {
    try {
      const printful = await runtime.usePlugin('printful', {
        variables: {
          baseUrl: 'https://api.printful.com',
        },
        secrets: {
          PRINTFUL_API_KEY: fulfillmentConfig.printful.apiKey,
          PRINTFUL_STORE_ID: fulfillmentConfig.printful.storeId,
          PRINTFUL_WEBHOOK_SECRET: fulfillmentConfig.printful.webhookSecret,
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

  return {
    providers,
    paymentProviders,
    exclusiveCheckProviders,
    getProvider: (name: string) => providers.find((p) => p.name === name) ?? null,
    getPaymentProvider: (name: string) => paymentProviders.find((p) => p.name === name) ?? null,
    getExclusiveCheckProvider: (name: string) => exclusiveCheckProviders.find((p) => p.name === name) ?? null,
    shutdown: () => runtime.shutdown(),
    luluBooks: fulfillmentConfig.lulu?.books ?? [],
  } as const;
}

export interface MarketplaceRuntime {
  readonly providers: FulfillmentProvider[];
  readonly paymentProviders: PaymentProvider[];
  readonly exclusiveCheckProviders: ExclusiveCheckProvider[];
  readonly getProvider: (name: string) => FulfillmentProvider | null;
  readonly getPaymentProvider: (name: string) => PaymentProvider | null;
  readonly getExclusiveCheckProvider: (name: string) => ExclusiveCheckProvider | null;
  readonly shutdown: () => Promise<void>;
  readonly luluBooks: LuluBookConfig[];
}
