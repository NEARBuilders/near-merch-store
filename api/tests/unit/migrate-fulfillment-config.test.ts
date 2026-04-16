import { describe, expect, it } from 'vitest';
import {
  isOldFormat,
  isAlreadyMigrated,
  migrateVariantConfig,
  extractAssetUrls,
  type OldFulfillmentConfig,
} from '@/services/migrate';
import type { FulfillmentConfig } from '@/schema';

describe('isOldFormat', () => {
  it('detects old Printful format', () => {
    const config = {
      externalVariantId: '71',
      externalProductId: '204',
      designFiles: [{ placement: 'front', url: 'https://example.com/design.png' }],
      providerData: { catalogVariantId: 71, catalogProductId: 204 },
    };
    expect(isOldFormat(config)).toBe(true);
  });

  it('detects old Lulu format', () => {
    const config = {
      externalVariantId: 'book-1',
      externalProductId: 'book-1',
      providerData: {
        sku: 'book-sku',
        podPackageId: 'pkg-123',
        pageCount: 200,
        coverPdfUrl: 'https://example.com/cover.pdf',
        interiorPdfUrl: 'https://example.com/interior.pdf',
      },
    };
    expect(isOldFormat(config)).toBe(true);
  });

  it('detects format by providerData key alone', () => {
    expect(isOldFormat({ providerData: {} })).toBe(true);
  });

  it('detects format by designFiles key alone', () => {
    expect(isOldFormat({ designFiles: [] })).toBe(true);
  });

  it('returns false for new format', () => {
    const config: FulfillmentConfig = {
      providerName: 'printful',
      providerConfig: { catalogVariantId: 71 },
      files: [{ assetId: 'a1', url: 'https://example.com/design.png', slot: 'front' }],
    };
    expect(isOldFormat(config)).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isOldFormat(null)).toBe(false);
    expect(isOldFormat(undefined)).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(isOldFormat({})).toBe(false);
  });
});

describe('isAlreadyMigrated', () => {
  it('detects new format', () => {
    const config: FulfillmentConfig = {
      providerName: 'printful',
      providerConfig: { catalogVariantId: 71 },
      files: [{ assetId: 'a1', url: 'https://example.com/design.png' }],
    };
    expect(isAlreadyMigrated(config)).toBe(true);
  });

  it('returns false for old format', () => {
    const config = {
      externalVariantId: '71',
      providerData: { catalogVariantId: 71 },
    };
    expect(isAlreadyMigrated(config)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isAlreadyMigrated(null)).toBe(false);
  });
});

describe('migrateVariantConfig', () => {
  it('migrates Printful variant with design files', () => {
    const oldConfig: OldFulfillmentConfig = {
      externalVariantId: '71',
      externalProductId: '204',
      designFiles: [
        { placement: 'front', url: 'https://cdn.example.com/design-front.png' },
        { placement: 'back', url: 'https://cdn.example.com/design-back.png' },
      ],
      providerData: { catalogVariantId: 71, catalogProductId: 204 },
    };

    const result = migrateVariantConfig(oldConfig, 'printful');

    expect(result.providerName).toBe('printful');
    expect(result.providerConfig).toEqual({
      catalogVariantId: 71,
      catalogProductId: 204,
    });
    expect(result.files).toHaveLength(2);
    expect(result.files[0]).toMatchObject({
      url: 'https://cdn.example.com/design-front.png',
      slot: 'front',
    });
    expect(result.files[0]!.assetId).toBeTruthy();
    expect(result.files[1]).toMatchObject({
      url: 'https://cdn.example.com/design-back.png',
      slot: 'back',
    });
  });

  it('migrates Printful variant without providerData — falls back to externalVariantId', () => {
    const oldConfig: OldFulfillmentConfig = {
      externalVariantId: '71',
      externalProductId: '204',
      designFiles: [{ placement: 'front', url: 'https://example.com/design.png' }],
    };

    const result = migrateVariantConfig(oldConfig, 'printful');

    expect(result.providerName).toBe('printful');
    expect(result.providerConfig.catalogVariantId).toBe(71);
    expect(result.providerConfig.catalogProductId).toBe(204);
  });

  it('migrates Lulu variant', () => {
    const oldConfig: OldFulfillmentConfig = {
      externalVariantId: 'book-1',
      externalProductId: 'book-1',
      providerData: {
        sku: 'book-sku',
        podPackageId: 'pkg-123',
        pageCount: 200,
        coverPdfUrl: 'https://example.com/cover.pdf',
        interiorPdfUrl: 'https://example.com/interior.pdf',
      },
    };

    const result = migrateVariantConfig(oldConfig, 'lulu');

    expect(result.providerName).toBe('lulu');
    expect(result.providerConfig).toEqual({
      sku: 'book-sku',
      podPackageId: 'pkg-123',
      pageCount: 200,
      coverPdfUrl: 'https://example.com/cover.pdf',
      interiorPdfUrl: 'https://example.com/interior.pdf',
    });
    expect(result.files).toHaveLength(0);
  });

  it('migrates variant with empty design files', () => {
    const oldConfig: OldFulfillmentConfig = {
      externalVariantId: '71',
      providerData: { catalogVariantId: 71, catalogProductId: 204 },
    };

    const result = migrateVariantConfig(oldConfig, 'printful');

    expect(result.files).toHaveLength(0);
    expect(result.providerConfig).toEqual({
      catalogVariantId: 71,
      catalogProductId: 204,
    });
  });

  it('preserves unknown providerData fields', () => {
    const oldConfig: OldFulfillmentConfig = {
      externalVariantId: '71',
      providerData: {
        catalogVariantId: 71,
        catalogProductId: 204,
        someCustomField: 'value',
      },
    };

    const result = migrateVariantConfig(oldConfig, 'printful');

    expect(result.providerConfig.someCustomField).toBe('value');
  });

  it('handles missing providerData gracefully', () => {
    const oldConfig: OldFulfillmentConfig = {
      externalVariantId: '71',
      externalProductId: '204',
    };

    const result = migrateVariantConfig(oldConfig, 'printful');

    expect(result.providerName).toBe('printful');
    expect(result.providerConfig.catalogVariantId).toBe(71);
    expect(result.providerConfig.catalogProductId).toBe(204);
  });

  it('does not override providerData with externalVariantId when providerData already has it', () => {
    const oldConfig: OldFulfillmentConfig = {
      externalVariantId: '999',
      providerData: { catalogVariantId: 71, catalogProductId: 204 },
    };

    const result = migrateVariantConfig(oldConfig, 'printful');

    expect(result.providerConfig.catalogVariantId).toBe(71);
  });
});

describe('extractAssetUrls', () => {
  it('extracts URLs from old-format designFiles', () => {
    const variants = [
      {
        fulfillmentConfig: {
          designFiles: [
            { placement: 'front', url: 'https://example.com/a.png' },
            { placement: 'back', url: 'https://example.com/b.png' },
          ],
          providerData: {},
        },
      },
    ];

    const assets = extractAssetUrls(variants);
    expect(assets.size).toBe(2);
    expect(assets.get('https://example.com/a.png')).toEqual({ url: 'https://example.com/a.png', type: 'image' });
  });

  it('extracts URLs from new-format files', () => {
    const variants = [
      {
        fulfillmentConfig: {
          providerName: 'printful',
          providerConfig: {},
          files: [
            { assetId: 'a1', url: 'https://example.com/a.png', slot: 'front' },
            { assetId: 'a2', url: 'https://example.com/b.png', slot: 'back' },
          ],
        },
      },
    ];

    const assets = extractAssetUrls(variants);
    expect(assets.size).toBe(2);
  });

  it('deduplicates URLs across variants', () => {
    const variants = [
      {
        fulfillmentConfig: {
          designFiles: [{ placement: 'front', url: 'https://example.com/same.png' }],
          providerData: {},
        },
      },
      {
        fulfillmentConfig: {
          designFiles: [{ placement: 'front', url: 'https://example.com/same.png' }],
          providerData: {},
        },
      },
    ];

    const assets = extractAssetUrls(variants);
    expect(assets.size).toBe(1);
  });

  it('returns empty map for variants with null config', () => {
    const variants = [
      { fulfillmentConfig: null },
      { fulfillmentConfig: undefined },
    ];

    const assets = extractAssetUrls(variants);
    expect(assets.size).toBe(0);
  });
});
