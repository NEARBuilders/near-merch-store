import { createPluginRuntime } from 'every-plugin';
import { ContractRouterClient } from 'every-plugin/orpc';
import { FulfillmentContract } from './services/fulfillment';
import { StorageContract } from './services/storage/contract';
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
import R2Plugin from './services/storage/r2';
import S3Plugin from './services/storage/s3';
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
    recipientAddress?: string;
    baseUrl?: string;
  };
}

export interface ExclusiveCheckConfig {
  nodeUrl: string;
}

export interface StorageConfig {
  provider: 'r2' | 's3';
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint?: string;
  publicUrl?: string;
  region?: string;
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

export interface StorageProvider {
  name: string;
  client: ContractRouterClient<typeof StorageContract>;
  router: any;
}

export async function createMarketplaceRuntime(
  fulfillmentConfig: FulfillmentConfig,
  paymentConfig?: PaymentConfig,
  exclusiveCheckConfig?: ExclusiveCheckConfig,
  storageConfig?: StorageConfig,
): Promise<MarketplaceRuntime> {
  const runtime = createPluginRuntime({
    registry: {
      printful: { module: PrintfulPlugin },
      lulu: { module: LuluPlugin },
      stripe: { module: StripePlugin },
      pingpay: { module: PingPayPlugin },
      'legion-holder': { module: LegionHolderPlugin },
      whitelist: { module: WhitelistPlugin },
      r2: { module: R2Plugin },
      s3: { module: S3Plugin },
    },
    secrets: {},
  });

  const providers: FulfillmentProvider[] = [];
  const paymentProviders: PaymentProvider[] = [];
  const exclusiveCheckProviders: ExclusiveCheckProvider[] = [];
  const storageProviders: StorageProvider[] = [];

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

  if (storageConfig) {
    try {
      const pluginName = storageConfig.provider === 's3' ? 's3' : 'r2';
      const storage = await runtime.usePlugin(pluginName, {
        variables: {
          bucket: storageConfig.bucket,
          ...(storageConfig.region ? { region: storageConfig.region } : {}),
          ...(storageConfig.endpoint ? { endpoint: storageConfig.endpoint } : {}),
          ...(storageConfig.publicUrl ? { publicUrl: storageConfig.publicUrl } : {}),
        },
        secrets: {
          ACCESS_KEY_ID: storageConfig.accessKeyId,
          SECRET_ACCESS_KEY: storageConfig.secretAccessKey,
        },
      });
      storageProviders.push({
        name: storageConfig.provider,
        client: storage.createClient(),
        router: storage.router,
      });
      console.log(`[MarketplaceRuntime] ${storageConfig.provider.toUpperCase()} storage provider initialized`);
    } catch (error) {
      console.error(`[MarketplaceRuntime] Failed to initialize ${storageConfig.provider.toUpperCase()} storage:`, error);
    }
  }

  if (paymentConfig?.ping) {
    try {
      const pingpay = await runtime.usePlugin('pingpay', {
        variables: {
          ...(paymentConfig.ping.recipientAddress ? { recipientAddress: paymentConfig.ping.recipientAddress } : {}),
          ...(paymentConfig.ping.baseUrl ? { baseUrl: paymentConfig.ping.baseUrl } : {}),
        },
        secrets: {
          PING_API_KEY: paymentConfig.ping.apiKey ?? '',
          PING_WEBHOOK_SECRET: paymentConfig.ping.webhookSecret ?? '',
        },
      });
      paymentProviders.push({
        name: 'pingpay',
        client: pingpay.createClient(),
        router: pingpay.router,
      });
      console.log('[MarketplaceRuntime] PingPay provider initialized');
    } catch (error) {
      console.error('[MarketplaceRuntime] Failed to initialize PingPay:', error);
    }
  }

  if (paymentConfig?.stripe?.secretKey && paymentConfig?.stripe?.webhookSecret) {
    try {
      const stripe = await runtime.usePlugin('stripe', {
        variables: {},
        secrets: {
          STRIPE_SECRET_KEY: paymentConfig.stripe.secretKey,
          STRIPE_WEBHOOK_SECRET: paymentConfig.stripe.webhookSecret,
        },
      });
      paymentProviders.push({
        name: 'stripe',
        client: stripe.createClient(),
        router: stripe.router,
      });
      console.log('[MarketplaceRuntime] Stripe provider initialized');
    } catch (error) {
      console.error('[MarketplaceRuntime] Failed to initialize Stripe:', error);
    }
  }

  return {
    providers,
    paymentProviders,
    exclusiveCheckProviders,
    storageProviders,
    getProvider: (name: string) => providers.find((p) => p.name === name) ?? null,
    getPaymentProvider: (name: string) => paymentProviders.find((p) => p.name === name) ?? null,
    getExclusiveCheckProvider: (name: string) => exclusiveCheckProviders.find((p) => p.name === name) ?? null,
    getStorageProvider: () => storageProviders[0] ?? null,
    shutdown: () => runtime.shutdown(),
    luluBooks: fulfillmentConfig.lulu?.books ?? [],
  } as const;
}

export interface MarketplaceRuntime {
  readonly providers: FulfillmentProvider[];
  readonly paymentProviders: PaymentProvider[];
  readonly exclusiveCheckProviders: ExclusiveCheckProvider[];
  readonly storageProviders: StorageProvider[];
  readonly getProvider: (name: string) => FulfillmentProvider | null;
  readonly getPaymentProvider: (name: string) => PaymentProvider | null;
  readonly getExclusiveCheckProvider: (name: string) => ExclusiveCheckProvider | null;
  readonly getStorageProvider: () => StorageProvider | null;
  readonly shutdown: () => Promise<void>;
  readonly luluBooks: LuluBookConfig[];
}
