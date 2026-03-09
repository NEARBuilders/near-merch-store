import { Context, Effect, Layer } from 'every-plugin/effect';
import type { MarketplaceRuntime } from '../runtime';
import type { ProviderBreakdown, ProviderShippingOption, QuoteItemInput, QuoteOutput, ShippingAddress, FulfillmentConfig, TaxBreakdown } from '../schema';
import { OrderStore, ProductStore } from '../store';
import type { FulfillmentOrderItem } from './fulfillment/schema';
import type { PaymentLineItem } from './payment/schema';
import { CheckoutError } from './checkout/errors';

interface ProviderItemGroup {
  item: QuoteItemInput;
  productId: string;
  variantId?: string;
  price: number;
  currency: string;
  fulfillmentConfig: FulfillmentConfig | undefined;
  productTitle: string;
  productDescription?: string;
  productImage?: string;
  fulfillmentProvider?: string;
}

export interface CreateCheckoutParams {
  userId: string;
  items: QuoteItemInput[];
  address: ShippingAddress;
  selectedRates: Record<string, string>;
  shippingCost: number;
  successUrl: string;
  cancelUrl: string;
  paymentProvider?: 'stripe' | 'pingpay';
}

export interface CreateCheckoutOutput {
  orderId: string;
  checkoutSessionId: string;
  checkoutUrl: string;
  draftOrderIds: Record<string, string>;
}

function buildRecipient(address: ShippingAddress) {
  return {
    name: `${address.firstName} ${address.lastName}`,
    company: address.companyName,
    address1: address.addressLine1,
    address2: address.addressLine2,
    city: address.city,
    stateCode: address.state,
    countryCode: address.country,
    zip: address.postCode,
    phone: address.phone,
    email: address.email,
    taxId: address.taxId,
  };
}

function mapToFulfillmentItems(providerItems: ProviderItemGroup[]): FulfillmentOrderItem[] {
  return providerItems.map(pi => {
    const config = pi.fulfillmentConfig;
    const providerData = config?.providerData as Record<string, unknown> | undefined;

    return {
      externalVariantId: config?.externalVariantId || undefined,
      productId: providerData?.catalogProductId as number | undefined,
      variantId: providerData?.catalogVariantId as number | undefined,
      quantity: pi.item.quantity,
      files: config?.designFiles?.map(df => ({
        url: df.url,
        type: 'default' as const,
        placement: df.placement,
      })),
    };
  });
}

export class CheckoutService extends Context.Tag('CheckoutService')<
  CheckoutService,
  {
    readonly getQuote: (
      items: QuoteItemInput[],
      address: ShippingAddress
    ) => Effect.Effect<QuoteOutput, Error>;
    readonly createCheckout: (
      params: CreateCheckoutParams
    ) => Effect.Effect<CreateCheckoutOutput, Error>;
  }
>() {}

export const CheckoutServiceLive = (runtime: MarketplaceRuntime) =>
  Layer.effect(
    CheckoutService,
    Effect.gen(function* () {
      const productStore = yield* ProductStore;
      const orderStore = yield* OrderStore;

      return {
        getQuote: (items, address) =>
          Effect.gen(function* () {
            const itemsByProvider = new Map<string, ProviderItemGroup[]>();

            let totalSubtotal = 0;
            const currency = 'USD';

            for (const item of items) {
              const product = yield* productStore.find(item.productId);
              if (!product) {
                return yield* Effect.fail(
                  new Error(`Product not found: ${item.productId}`)
                );
              }

              const selectedVariant = item.variantId
                ? product.variants.find(v => v.id === item.variantId)
                : product.variants[0];

              const unitPrice = selectedVariant?.price ?? product.price;
              const itemSubtotal = unitPrice * item.quantity;
              totalSubtotal += itemSubtotal;

              const provider = product.fulfillmentProvider || 'manual';

              if (!itemsByProvider.has(provider)) {
                itemsByProvider.set(provider, []);
              }

              itemsByProvider.get(provider)!.push({
                item,
                productId: product.id,
                variantId: selectedVariant?.id,
                price: unitPrice,
                currency: selectedVariant?.currency ?? product.currency ?? currency,
                fulfillmentConfig: selectedVariant?.fulfillmentConfig,
                productTitle: product.title,
                productDescription: product.description,
                productImage: product.images?.[0]?.url,
                fulfillmentProvider: product.fulfillmentProvider,
              });
            }

            const providerBreakdown: ProviderBreakdown[] = [];
            let totalShippingCost = 0;
            let minDeliveryDays: number | undefined;
            let maxDeliveryDays: number | undefined;

            for (const [providerName, providerItems] of itemsByProvider.entries()) {
              const provider = runtime.getProvider(providerName);

              if (!provider) {
                if (providerName === 'manual') {
                  const manualSubtotal = providerItems.reduce(
                    (sum, pi) => sum + pi.price * pi.item.quantity,
                    0
                  );

                  const manualShipping: ProviderShippingOption = {
                    provider: 'manual',
                    rateId: 'manual-standard',
                    rateName: 'Standard Shipping',
                    shippingCost: 0,
                    currency,
                    minDeliveryDays: 5,
                    maxDeliveryDays: 10,
                  };

                  providerBreakdown.push({
                    provider: 'manual',
                    itemCount: providerItems.length,
                    subtotal: manualSubtotal,
                    selectedShipping: manualShipping,
                    availableRates: [manualShipping],
                  });

                  if (minDeliveryDays === undefined || manualShipping.minDeliveryDays! < minDeliveryDays) {
                    minDeliveryDays = manualShipping.minDeliveryDays;
                  }
                  if (maxDeliveryDays === undefined || manualShipping.maxDeliveryDays! > maxDeliveryDays) {
                    maxDeliveryDays = manualShipping.maxDeliveryDays;
                  }

                  continue;
                }

                return yield* Effect.fail(
                  new Error(`Provider not configured: ${providerName}`)
                );
              }

              const fulfillmentItems = mapToFulfillmentItems(providerItems);

              const quoteResult = yield* Effect.tryPromise({
                try: () =>
                  provider.client.quoteOrder({
                    recipient: buildRecipient(address),
                    items: fulfillmentItems,
                    currency,
                  }),
                catch: (error) =>
                  new CheckoutError({
                    code: 'QUOTE_FAILED',
                    provider: providerName,
                    cause: error,
                  }),
              });

              const rates = quoteResult.rates || [];
              if (rates.length === 0) {
                return yield* Effect.fail(
                  new Error(`No shipping rates available from ${providerName}`)
                );
              }

              const selectedRate = rates.reduce((cheapest, rate) =>
                rate.rate < cheapest.rate ? rate : cheapest
              );

              const availableRates: ProviderShippingOption[] = rates.map(rate => ({
                provider: providerName,
                rateId: rate.id,
                rateName: rate.name,
                shippingCost: rate.rate,
                currency: rate.currency,
                minDeliveryDays: rate.minDeliveryDays,
                maxDeliveryDays: rate.maxDeliveryDays,
              }));

              const selectedShipping: ProviderShippingOption = {
                provider: providerName,
                rateId: selectedRate.id,
                rateName: selectedRate.name,
                shippingCost: selectedRate.rate,
                currency: selectedRate.currency,
                minDeliveryDays: selectedRate.minDeliveryDays,
                maxDeliveryDays: selectedRate.maxDeliveryDays,
              };

              const providerSubtotal = providerItems.reduce(
                (sum, pi) => sum + pi.price * pi.item.quantity,
                0
              );

              providerBreakdown.push({
                provider: providerName,
                itemCount: providerItems.length,
                subtotal: providerSubtotal,
                selectedShipping,
                availableRates,
              });

              totalShippingCost += selectedRate.rate;

              if (selectedRate.minDeliveryDays !== undefined) {
                if (minDeliveryDays === undefined || selectedRate.minDeliveryDays < minDeliveryDays) {
                  minDeliveryDays = selectedRate.minDeliveryDays;
                }
              }
              if (selectedRate.maxDeliveryDays !== undefined) {
                if (maxDeliveryDays === undefined || selectedRate.maxDeliveryDays > maxDeliveryDays) {
                  maxDeliveryDays = selectedRate.maxDeliveryDays;
                }
              }
            }

            const taxCalculationItems: Array<{ catalogVariantId: number; quantity: number }> = [];
            for (const [providerName, providerItems] of itemsByProvider.entries()) {
              if (providerName === 'manual') continue;
              for (const pi of providerItems) {
                const catalogVariantId = pi.fulfillmentConfig?.providerData?.catalogVariantId;
                if (catalogVariantId && typeof catalogVariantId === 'number') {
                  taxCalculationItems.push({
                    catalogVariantId,
                    quantity: pi.item.quantity,
                  });
                }
              }
            }

            let tax = 0;
            let taxBreakdown: { required: boolean; rate: number; shippingTaxable: boolean; exempt: boolean } | undefined;

            if (taxCalculationItems.length > 0) {
              const printfulProvider = runtime.getProvider('printful');
              if (printfulProvider) {
                const taxResult = yield* Effect.tryPromise({
                  try: () =>
                    printfulProvider.client.calculateTax({
                      recipient: {
                        countryCode: address.country,
                        stateCode: address.state,
                        zip: address.postCode,
                        city: address.city,
                        taxId: address.taxId,
                      },
                      items: taxCalculationItems,
                      currency,
                    }),
                  catch: (error) => {
                    console.error('[getQuote] Tax calculation failed:', error);
                    return null;
                  },
                });

                if (taxResult) {
                  taxBreakdown = {
                    required: taxResult.required,
                    rate: taxResult.rate,
                    shippingTaxable: taxResult.shippingTaxable,
                    exempt: taxResult.exempt,
                  };

                  if (taxResult.required && taxResult.rate > 0) {
                    const taxableAmount = taxResult.shippingTaxable
                      ? totalSubtotal + totalShippingCost
                      : totalSubtotal;
                    tax = Math.round(taxableAmount * taxResult.rate);
                  }
                }
              }
            }

            return {
              subtotal: totalSubtotal,
              shippingCost: totalShippingCost,
              tax,
              taxBreakdown,
              total: totalSubtotal + totalShippingCost + tax,
              currency,
              providerBreakdown,
              estimatedDelivery:
                minDeliveryDays !== undefined && maxDeliveryDays !== undefined
                  ? { minDays: minDeliveryDays, maxDays: maxDeliveryDays }
                  : undefined,
            };
          }),

        createCheckout: (params) =>
          Effect.gen(function* () {
            const { userId, items, address, selectedRates, shippingCost, successUrl, cancelUrl } = params;

            const itemsByProvider = new Map<string, ProviderItemGroup[]>();

            let totalSubtotal = 0;
            const currency = 'USD';

            for (const item of items) {
              const product = yield* productStore.find(item.productId);
              if (!product) {
                return yield* Effect.fail(
                  new Error(`Product not found: ${item.productId}`)
                );
              }

              const selectedVariant = item.variantId
                ? product.variants.find(v => v.id === item.variantId)
                : product.variants[0];

              const unitPrice = selectedVariant?.price ?? product.price;
              const itemSubtotal = unitPrice * item.quantity;
              totalSubtotal += itemSubtotal;

              const provider = product.fulfillmentProvider || 'manual';

              if (!itemsByProvider.has(provider)) {
                itemsByProvider.set(provider, []);
              }

              itemsByProvider.get(provider)!.push({
                item,
                productId: product.id,
                variantId: selectedVariant?.id,
                price: unitPrice,
                currency: selectedVariant?.currency ?? product.currency ?? currency,
                fulfillmentConfig: selectedVariant?.fulfillmentConfig,
                productTitle: product.title,
                productDescription: product.description,
                productImage: product.images?.[0]?.url,
                fulfillmentProvider: product.fulfillmentProvider,
              });
            }

            let verifiedShippingCost = 0;
            const taxCalculationItems: Array<{ catalogVariantId: number; quantity: number }> = [];

            for (const [providerName, providerItems] of itemsByProvider.entries()) {
              if (providerName === 'manual') continue;

              const provider = runtime.getProvider(providerName);
              if (!provider) continue;

              const selectedRateId = selectedRates[providerName];
              if (!selectedRateId) continue;

              const fulfillmentItems = mapToFulfillmentItems(providerItems);

              const quoteResult = yield* Effect.tryPromise({
                try: () =>
                  provider.client.quoteOrder({
                    recipient: buildRecipient(address),
                    items: fulfillmentItems,
                    currency,
                  }),
                catch: (error) => {
                  console.error(`[createCheckout] Failed to get shipping rates for ${providerName}:`, error);
                  return null;
                },
              });

              if (quoteResult) {
                const selectedRate = quoteResult.rates?.find(r => r.id === selectedRateId);
                if (selectedRate) {
                  verifiedShippingCost += selectedRate.rate;
                }
              }

              for (const pi of providerItems) {
                const catalogVariantId = pi.fulfillmentConfig?.providerData?.catalogVariantId;
                if (catalogVariantId && typeof catalogVariantId === 'number') {
                  taxCalculationItems.push({
                    catalogVariantId,
                    quantity: pi.item.quantity,
                  });
                }
              }
            }

            const manualItems = itemsByProvider.get('manual') || [];
            if (manualItems.length > 0) {
              verifiedShippingCost += 0;
            }

            let tax = 0;
            let taxRequired: boolean | undefined;
            let taxRate: number | undefined;
            let taxShippingTaxable: boolean | undefined;
            let taxExempt = false;

            if (taxCalculationItems.length > 0) {
              const printfulProvider = runtime.getProvider('printful');
              if (printfulProvider) {
                const taxResult = yield* Effect.tryPromise({
                  try: () =>
                    printfulProvider.client.calculateTax({
                      recipient: {
                        countryCode: address.country,
                        stateCode: address.state,
                        zip: address.postCode,
                        city: address.city,
                        taxId: address.taxId,
                      },
                      items: taxCalculationItems,
                      currency,
                    }),
                  catch: (error) => {
                    console.error('[createCheckout] Tax calculation failed:', error);
                    return null;
                  },
                });

                if (taxResult) {
                  taxRequired = taxResult.required;
                  taxRate = taxResult.rate;
                  taxShippingTaxable = taxResult.shippingTaxable;
                  taxExempt = taxResult.exempt;

                  if (taxResult.required && taxResult.rate > 0) {
                    const taxableAmount = taxResult.shippingTaxable
                      ? totalSubtotal + verifiedShippingCost
                      : totalSubtotal;
                    tax = Math.round(taxableAmount * taxResult.rate);
                  }
                }
              }
            }

            const totalAmount = totalSubtotal + verifiedShippingCost + tax;

            const orderItems = Array.from(itemsByProvider.values())
              .flat()
              .map(pi => ({
                productId: pi.productId,
                variantId: pi.variantId,
                productName: pi.productTitle,
                quantity: pi.item.quantity,
                unitPrice: pi.price,
                fulfillmentProvider: pi.fulfillmentProvider,
                fulfillmentConfig: pi.fulfillmentConfig,
              }));

            const order = yield* orderStore.create({
              userId,
              items: orderItems,
              subtotal: totalSubtotal,
              shippingCost: verifiedShippingCost,
              taxAmount: tax,
              taxRequired,
              taxRate: taxRate !== undefined ? Math.round(taxRate * 10000) : undefined,
              taxShippingTaxable,
              taxExempt,
              customerTaxId: address.taxId,
              totalAmount,
              currency,
            });

            const draftOrderIds: Record<string, string> = {};

            for (const [providerName, providerItems] of itemsByProvider.entries()) {
              const selectedRateId = selectedRates[providerName];
              if (!selectedRateId) {
                return yield* Effect.fail(
                  new Error(`No shipping rate selected for provider: ${providerName}`)
                );
              }

              if (providerName === 'manual') {
                continue;
              }

              const provider = runtime.getProvider(providerName);
              if (!provider) {
                return yield* Effect.fail(
                  new Error(`Provider not configured: ${providerName}`)
                );
              }

              const fulfillmentItems = mapToFulfillmentItems(providerItems);

              const draftOrder = yield* Effect.tryPromise({
                try: () =>
                  provider.client.createOrder({
                    externalId: order.fulfillmentReferenceId || order.id,
                    recipient: buildRecipient(address),
                    items: fulfillmentItems,
                    retailCosts: {
                      currency,
                    },
                  }),
                catch: (error) =>
                  new CheckoutError({
                    code: 'DRAFT_ORDER_FAILED',
                    provider: providerName,
                    orderId: order.id,
                    userId,
                    cause: error,
                  }),
              });

              draftOrderIds[providerName] = draftOrder.id;
            }

            const providerName = params.paymentProvider || 'stripe';
            const paymentProvider = runtime.getPaymentProvider(providerName);
            if (!paymentProvider) {
              return yield* Effect.fail(
                new Error(`Payment provider '${providerName}' not configured`)
              );
            }

            const lineItems: PaymentLineItem[] = Array.from(itemsByProvider.values())
              .flat()
              .map(pi => ({
                name: pi.productTitle,
                description: pi.productDescription,
                image: pi.productImage,
                unitAmount: Math.round(pi.price * 100),
                quantity: pi.item.quantity,
              }));

            if (verifiedShippingCost > 0) {
              lineItems.push({
                name: 'Shipping',
                unitAmount: Math.round(verifiedShippingCost * 100),
                quantity: 1,
              });
            }

            if (tax > 0) {
              lineItems.push({
                name: 'Tax',
                unitAmount: Math.round(tax * 100),
                quantity: 1,
              });
            }

            const paymentRequest = {
              orderId: order.id,
              amount: Math.round(totalAmount * 100),
              currency,
              items: lineItems,
              successUrl,
              cancelUrl,
            };

            const checkout = yield* Effect.tryPromise({
              try: () => paymentProvider.client.createCheckout(paymentRequest),
              catch: (error) => {
                console.error(`[Checkout] Payment provider '${providerName}' createCheckout failed:`, error);
                return new CheckoutError({
                  code: 'PAYMENT_CHECKOUT_FAILED',
                  orderId: order.id,
                  userId,
                  cause: error,
                });
              },
            });

            yield* orderStore.updatePaymentDetails(order.id, {
              provider: providerName,
              request: paymentRequest,
              response: {
                sessionId: checkout.sessionId,
                url: checkout.url,
              },
              createdAt: new Date().toISOString(),
            });

            yield* orderStore.updateCheckout(order.id, checkout.sessionId, providerName);

            yield* orderStore.updateDraftOrderIds(order.id, draftOrderIds);

            yield* orderStore.updateStatus(order.id, 'draft_created');

            return {
              orderId: order.id,
              checkoutSessionId: checkout.sessionId,
              checkoutUrl: checkout.url,
              draftOrderIds,
            };
          }),
      };
    })
  );
