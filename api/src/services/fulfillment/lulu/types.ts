import { z } from 'every-plugin/zod';

// OAuth2 Token Response
export const LuluTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string().default('Bearer'),
  expires_in: z.number(),
  scope: z.string().optional(),
});

// Lulu Address Structure
export const LuluAddressSchema = z.object({
  name: z.string(),
  company: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  address_line_1: z.string(),
  address_line_2: z.string().optional(),
  city: z.string(),
  state_code: z.string().optional(),
  country: z.string(),
  zip: z.string(),
});

// Lulu Line Item for Print Jobs
export const LuluLineItemSchema = z.object({
  external_id: z.string(),
  line_item_id: z.string().optional(),
  printable_normalization: z.object({
    cover: z.object({
      source_url: z.string().url(),
    }),
    interior: z.object({
      source_url: z.string().url(),
    }),
    pod_package_id: z.string(),
  }),
  quantity: z.number().int().positive(),
  shipping_address: LuluAddressSchema,
});

// Print Job Status Types
export const LuluPrintJobStatusSchema = z.enum([
  'CREATED',
  'UNPAID',
  'REJECTED',
  'PENDING',
  'MANUFACTURING',
  'SHIPPED',
  'CANCELLED',
]);

// Status mapping from Lulu to our internal format
export const LULU_STATUS_MAP: Record<string, string> = {
  'CREATED': 'pending',
  'UNPAID': 'pending',
  'REJECTED': 'failed',
  'PENDING': 'processing',
  'MANUFACTURING': 'printing',
  'SHIPPED': 'shipped',
  'CANCELLED': 'cancelled',
};

// Print Job Request
export const LuluPrintJobRequestSchema = z.object({
  external_id: z.string(),
  line_items: z.array(LuluLineItemSchema),
  production_delay: z.number().int().optional(),
  shipping_level: z.string().optional(),
  shipping_address: LuluAddressSchema,
  email: z.string().email(),
});

// Print Job Response
export const LuluPrintJobResponseSchema = z.object({
  id: z.number(),
  external_id: z.string(),
  line_items: z.array(z.object({
    id: z.number(),
    external_id: z.string(),
    line_item_id: z.string().optional(),
    printable_normalization: z.object({
      cover: z.object({
        source_url: z.string().url(),
      }),
      interior: z.object({
        source_url: z.string().url(),
      }),
      pod_package_id: z.string(),
    }),
    quantity: z.number(),
    shipping_address: LuluAddressSchema,
  })),
  status: LuluPrintJobStatusSchema,
  shipping_address: LuluAddressSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Print Job Costs
export const LuluPrintJobCostSchema = z.object({
  total_cost_incl_tax: z.string(),
  total_tax: z.string(),
  shipping_cost: z.object({
    total_cost_excl_tax: z.string(),
    total_cost_incl_tax: z.string(),
    total_tax: z.string(),
  }),
  line_item_costs: z.array(z.object({
    cost_excl_tax: z.string(),
    cost_incl_tax: z.string(),
    tax: z.string(),
  })),
});

// Shipping Options
export const LuluShippingOptionSchema = z.object({
  level: z.string(),
  total_cost_excl_tax: z.string(),
  total_cost_incl_tax: z.string(),
  currency: z.string(),
});

// Shipping Quote Request
export const LuluShippingQuoteRequestSchema = z.object({
  line_items: z.array(z.object({
    quantity: z.number().int().positive(),
    page_count: z.number().int().positive(),
    pod_package_id: z.string(),
  })),
  shipping_address: LuluAddressSchema,
  shipping_level: z.string().optional(),
});

// Shipping Quote Response
export const LuluShippingQuoteResponseSchema = z.object({
  shipping_options: z.array(LuluShippingOptionSchema),
  line_item_count: z.number(),
  currency: z.string(),
});

// Webhook Payload Types
export const LuluWebhookPayloadSchema = z.object({
  id: z.number(),
  data: z.object({
    id: z.number(),
    external_id: z.string(),
    status: LuluPrintJobStatusSchema,
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    line_items: z.array(z.object({
      id: z.number(),
      external_id: z.string(),
      status: z.string(),
      tracking_number: z.string().optional(),
      tracking_urls: z.array(z.string().url()).optional(),
      carrier: z.string().optional(),
      shipping_level: z.string().optional(),
    })).optional(),
    shipping_address: LuluAddressSchema.optional(),
  }),
  type: z.string(), // e.g., 'printjob.status.updated'
  created_at: z.string().datetime(),
});

// Type exports
export type LuluTokenResponse = z.infer<typeof LuluTokenResponseSchema>;
export type LuluAddress = z.infer<typeof LuluAddressSchema>;
export type LuluLineItem = z.infer<typeof LuluLineItemSchema>;
export type LuluPrintJobStatus = z.infer<typeof LuluPrintJobStatusSchema>;
export type LuluPrintJobRequest = z.infer<typeof LuluPrintJobRequestSchema>;
export type LuluPrintJobResponse = z.infer<typeof LuluPrintJobResponseSchema>;
export type LuluPrintJobCost = z.infer<typeof LuluPrintJobCostSchema>;
export type LuluShippingOption = z.infer<typeof LuluShippingOptionSchema>;
export type LuluShippingQuoteRequest = z.infer<typeof LuluShippingQuoteRequestSchema>;
export type LuluShippingQuoteResponse = z.infer<typeof LuluShippingQuoteResponseSchema>;
export type LuluWebhookPayload = z.infer<typeof LuluWebhookPayloadSchema>;

// Extended provider data for storing SKU and PDF URLs
export interface LuluProviderData {
  sku: string;
  podPackageId: string;
  pageCount: number;
  coverPdfUrl: string;
  interiorPdfUrl: string;
  shippingLevel?: string;
}
