import { oc } from 'every-plugin/orpc';
import { z } from 'every-plugin/zod';
import {
  PingOutputSchema,
  BrowseCatalogInputSchema,
  BrowseCatalogOutputSchema,
  CatalogProductDetailOutputSchema,
  CatalogVariantsOutputSchema,
  VariantPriceOutputSchema,
  GenerateMockupsInputSchema,
  GenerateMockupsOutputSchema,
  GetMockupResultOutputSchema,
  CreateOrderInputSchema,
  OrderResultSchema,
  OrderDetailOutputSchema,
  ShippingQuoteInputSchema,
  ShippingQuoteOutputSchema,
  TaxQuoteInputSchema,
  TaxQuoteOutputSchema,
  GetPlacementsInputSchema,
  GetPlacementsOutputSchema,
} from './schema';

export const FulfillmentContract = oc.router({
  ping: oc
    .route({ method: 'GET', path: '/ping' })
    .output(PingOutputSchema),

  browseCatalog: oc
    .route({ method: 'GET', path: '/catalog' })
    .input(BrowseCatalogInputSchema)
    .output(BrowseCatalogOutputSchema),

  getCatalogProduct: oc
    .route({ method: 'GET', path: '/catalog/{id}' })
    .input(z.object({ id: z.string() }))
    .output(CatalogProductDetailOutputSchema),

  getCatalogProductVariants: oc
    .route({ method: 'GET', path: '/catalog/{id}/variants' })
    .input(z.object({ id: z.string() }))
    .output(CatalogVariantsOutputSchema),

  getVariantPrice: oc
    .route({ method: 'GET', path: '/catalog/variants/{id}/price' })
    .input(z.object({ id: z.string() }))
    .output(VariantPriceOutputSchema),

  generateMockups: oc
    .route({ method: 'POST', path: '/mockups/generate' })
    .input(GenerateMockupsInputSchema)
    .output(GenerateMockupsOutputSchema),

  getMockupResult: oc
    .route({ method: 'GET', path: '/mockups/{taskId}' })
    .input(z.object({ taskId: z.string() }))
    .output(GetMockupResultOutputSchema),

  createOrder: oc
    .route({ method: 'POST', path: '/orders' })
    .input(CreateOrderInputSchema)
    .output(OrderResultSchema),

  getOrder: oc
    .route({ method: 'GET', path: '/orders/{id}' })
    .input(z.object({ id: z.string() }))
    .output(OrderDetailOutputSchema),

  confirmOrder: oc
    .route({ method: 'POST', path: '/orders/{id}/confirm' })
    .input(z.object({ id: z.string() }))
    .output(OrderResultSchema),

  cancelOrder: oc
    .route({ method: 'POST', path: '/orders/{id}/cancel' })
    .input(z.object({ id: z.string() }))
    .output(OrderResultSchema),

  quoteShipping: oc
    .route({ method: 'POST', path: '/shipping/quote' })
    .input(ShippingQuoteInputSchema)
    .output(ShippingQuoteOutputSchema),

  calculateTax: oc
    .route({ method: 'POST', path: '/tax/calculate' })
    .input(TaxQuoteInputSchema)
    .output(TaxQuoteOutputSchema),

  getPlacements: oc
    .route({ method: 'POST', path: '/placements' })
    .input(GetPlacementsInputSchema)
    .output(GetPlacementsOutputSchema),
});

export type FulfillmentContractType = typeof FulfillmentContract;
