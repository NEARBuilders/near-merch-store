import { createPluginRuntime } from 'every-plugin';
import { ContractRouterClient } from 'every-plugin/orpc';
import { FulfillmentContract } from './services/fulfillment';
import GelatoPlugin from './services/fulfillment/gelato';
import PrintfulPlugin from './services/fulfillment/printful';
import { PaymentContract } from './services/payment';
import PingPayPlugin from './services/payment/pingpay';
import StripePlugin from './services/payment/stripe';
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

export async function createMarketplaceRuntime(
  fulfillmentConfig: FulfillmentConfig,
  paymentConfig?: PaymentConfig
) {
  const runtime = createPluginRuntime({
    registry: {
      printful: { module: PrintfulPlugin },
      gelato: { module: GelatoPlugin },
      stripe: { module: StripePlugin },
      pingpay: { module: PingPayPlugin },
    },
    secrets: {},
  });

  const providers: FulfillmentProvider[] = [];
  const paymentProviders: PaymentProvider[] = [];

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

  return {
    providers,
    paymentProviders,
    getProvider: (name: string) => providers.find((p) => p.name === name) ?? null,
    getPaymentProvider: (name: string) => paymentProviders.find((p) => p.name === name) ?? null,
    shutdown: () => runtime.shutdown(),
  } as const;
}

export type MarketplaceRuntime = Awaited<ReturnType<typeof createMarketplaceRuntime>>;
