import { createPluginRuntime } from 'every-plugin';
import { ContractRouterClient } from 'every-plugin/orpc';
import { FulfillmentContract } from './services/fulfillment';
import GelatoPlugin from './services/fulfillment/gelato';
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
) {
  const runtime = createPluginRuntime({
    registry: {
      printful: { module: PrintfulPlugin },
      gelato: { module: GelatoPlugin },
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

  if (fulfillmentConfig.gelato?.apiKey && fulfillmentConfig.gelato?.webhookSecret) {
    try {
      const gelato = await runtime.usePlugin('gelato', {
        variables: {
          baseUrl: 'https://order.gelatoapis.com/v4',
          returnAddress: fulfillmentConfig.gelato.returnAddress,
        },
        secrets: {
          GELATO_API_KEY: fulfillmentConfig.gelato.apiKey,
          GELATO_WEBHOOK_SECRET: fulfillmentConfig.gelato.webhookSecret,
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

  if (fulfillmentConfig.lulu?.clientKey && fulfillmentConfig.lulu?.clientSecret) {
    try {
      const lulu = await runtime.usePlugin('lulu', {
        variables: {
          baseUrl: fulfillmentConfig.lulu.environment === 'production' ? 'https://api.lulu.com' : 'https://api.sandbox.lulu.com',
          environment: fulfillmentConfig.lulu.environment || 'sandbox',
          books: fulfillmentConfig.lulu.books || [],
        },
        secrets: {
          LULU_CLIENT_KEY: fulfillmentConfig.lulu.clientKey,
          LULU_CLIENT_SECRET: fulfillmentConfig.lulu.clientSecret,
        },
      });
      providers.push({
        name: 'lulu',
        client: lulu.createClient(),
        router: lulu.router,
      });
      console.log('[MarketplaceRuntime] Lulu provider initialized');
    } catch (error) {
      console.error('[MarketplaceRuntime] Failed to initialize Lulu:', error);
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
      console.log('[MarketplaceRuntime] Stripe payment provider initialized');
    } catch (error) {
      console.error('[MarketplaceRuntime] Failed to initialize Stripe:', error);
    }
  }

  try {
    const pingpay = await runtime.usePlugin('pingpay', {
      variables: {
        baseUrl: 'https://pay.pingpay.io',
        recipientAddress: 'near-merch-store.near',
      },
      secrets: {
        PING_API_KEY: paymentConfig?.ping?.apiKey,
        PING_WEBHOOK_SECRET: paymentConfig?.ping?.webhookSecret,
      },
    });
    paymentProviders.push({
      name: 'pingpay',
      client: pingpay.createClient(),
      router: pingpay.router,
    });
    console.log('[MarketplaceRuntime] PingPay payment provider initialized');
  } catch (error) {
    console.error('[MarketplaceRuntime] Failed to initialize PingPay:', error);
  }

  console.log(`[MarketplaceRuntime] Enabled fulfillment providers: ${providers.map((p) => p.name).join(', ') || 'none'}`);
  console.log(`[MarketplaceRuntime] Enabled payment providers: ${paymentProviders.map((p) => p.name).join(', ') || 'none'}`);

  try {
    const legionHolder = await runtime.usePlugin('legion-holder', {
      variables: {
        nodeUrl: exclusiveCheckConfig?.nodeUrl || 'https://rpc.mainnet.near.org',
      },
      secrets: {},
    });
    exclusiveCheckProviders.push({
      name: 'legion-holder',
      client: legionHolder.createClient(),
      router: legionHolder.router,
    });
    console.log('[MarketplaceRuntime] Legion holder exclusive check provider initialized');
  } catch (error) {
    console.error('[MarketplaceRuntime] Failed to initialize Legion holder provider:', error);
  }

  try {
    const whitelist = await runtime.usePlugin('whitelist', {
      variables: {},
      secrets: {},
    });
    exclusiveCheckProviders.push({
      name: 'whitelist',
      client: whitelist.createClient(),
      router: whitelist.router,
    });
    console.log('[MarketplaceRuntime] Whitelist exclusive check provider initialized');
  } catch (error) {
    console.error('[MarketplaceRuntime] Failed to initialize Whitelist:', error);
  }

  console.log(`[MarketplaceRuntime] Enabled exclusive check providers: ${exclusiveCheckProviders.map((p) => p.name).join(', ') || 'none'}`);

  return {
    providers,
    paymentProviders,
    exclusiveCheckProviders,
    getProvider: (name: string) => providers.find((p) => p.name === name) ?? null,
    getPaymentProvider: (name: string) => paymentProviders.find((p) => p.name === name) ?? null,
    getExclusiveCheckProvider: (name: string) => exclusiveCheckProviders.find((p) => p.name === name) ?? null,
    shutdown: () => runtime.shutdown(),
  } as const;
}

export type MarketplaceRuntime = Awaited<ReturnType<typeof createMarketplaceRuntime>>;
