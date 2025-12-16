import { z } from 'every-plugin/zod';

export const PrintfulFileType = z.string();

export const PrintfulOrderStatus = z.enum([
  'draft',
  'pending',
  'failed',
  'canceled',
  'cancelled',
  'inprocess',
  'onhold',
  'partial',
  'fulfilled',
  'inreview',
]);

export const PrintfulFileSchema = z.object({
  id: z.number(),
  type: z.string(), // We use string here to be flexible with incoming API data, but logic will prioritize known types
  url: z.string(),
  preview_url: z.string().nullable().optional(),
});

export const PrintfulSyncVariantSchema = z.object({
  id: z.number(),
  external_id: z.string(),
  sync_product_id: z.number(),
  name: z.string(),
  synced: z.boolean(),
  variant_id: z.number(),
  retail_price: z.string().nullable(),
  currency: z.string(),
  product: z.object({
    variant_id: z.number(),
    product_id: z.number(),
    image: z.string(),
    name: z.string(),
  }),
  files: z.array(PrintfulFileSchema),
});

export const PrintfulSyncProductSchema = z.object({
  id: z.number(),
  external_id: z.string(),
  name: z.string(),
  variants: z.number(),
  synced: z.number(),
  thumbnail_url: z.string().nullable(),
  is_ignored: z.boolean(),
});

export const PrintfulCatalogVariantSchema = z.object({
  id: z.number(),
  catalog_product_id: z.number(),
  name: z.string(),
  size: z.string(),
  color: z.string(),
  color_code: z.string(),
  color_code2: z.string().nullable().optional(),
  image: z.string(),
});

export type PrintfulFileType = z.infer<typeof PrintfulFileType>;
export type PrintfulOrderStatus = z.infer<typeof PrintfulOrderStatus>;
export type PrintfulSyncVariant = z.infer<typeof PrintfulSyncVariantSchema>;
export type PrintfulSyncProduct = z.infer<typeof PrintfulSyncProductSchema>;
export type PrintfulCatalogVariant = z.infer<typeof PrintfulCatalogVariantSchema>;

// Mockup-related types for Printful service
export const MockupStyleSchema = z.enum([
  'Lifestyle',
  'Lifestyle 2',
  'Lifestyle 3',
  'Flat',
  'Flat 2',
  'On Figure',
  'On Hanger',
  'Closeup',
  'Back',
  'Front',
  'Left',
  'Right',
  '3/4 Front',
  '3/4 Back',
]);

export const MockupPlacementSchema = z.enum([
  'front',
  'back',
  'left',
  'right',
  'front_large',
  'back_large',
  'label_outside',
  'sleeve_left',
  'sleeve_right',
  'embroidery_front',
  'embroidery_back',
]);

export const MockupFormatSchema = z.enum(['jpg', 'png']);

export const MockupConfigSchema = z.object({
  styles: z.array(MockupStyleSchema).default(['Lifestyle', 'Flat']),
  placements: z.array(MockupPlacementSchema).default(['front']),
  format: MockupFormatSchema.default('jpg'),
  generateOnSync: z.boolean().default(true),
});

export const MockupResultSchema = z.object({
  variantId: z.number(),
  placement: z.string(),
  style: z.string(),
  imageUrl: z.string(),
});

export const MockupTaskResultSchema = z.object({
  status: z.enum(['pending', 'completed', 'failed']),
  mockups: z.array(MockupResultSchema),
});

export const MockupStyleInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  placement: z.string().optional(),
  technique: z.string().optional(),
  viewName: z.string().optional(),
});

export type MockupStyle = z.infer<typeof MockupStyleSchema>;
export type MockupPlacement = z.infer<typeof MockupPlacementSchema>;
export type MockupFormat = z.infer<typeof MockupFormatSchema>;
export type MockupConfig = z.infer<typeof MockupConfigSchema>;
export type MockupResult = z.infer<typeof MockupResultSchema>;
export type MockupTaskResult = z.infer<typeof MockupTaskResultSchema>;
export type MockupStyleInfo = z.infer<typeof MockupStyleInfoSchema>;

const IGNORED_FILE_TYPES = new Set(['preview', 'default', 'printfile', 'label']);

export function extractDesignFiles(
  files: Array<{ type: string; url: string | null; previewUrl?: string | null }> | undefined
): Array<{ placement: string; url: string }> {
  if (!files?.length) return [];

  const byPlacement = new Map<string, string>();

  for (const file of files) {
    const url = file.url || file.previewUrl;
    if (!url) continue;

    if (IGNORED_FILE_TYPES.has(file.type)) continue;

    if (!byPlacement.has(file.type)) {
      byPlacement.set(file.type, url);
    }
  }

  const result: Array<{ placement: string; url: string }> = [];
  for (const [placement, url] of byPlacement) {
    result.push({ placement, url });
  }

  return result;
}
