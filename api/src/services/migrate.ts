import { Effect } from 'every-plugin/effect';
import type { FulfillmentConfig } from '../schema';
import type { FulfillmentFile } from './fulfillment/schema';

export interface OldFulfillmentConfig {
  externalVariantId?: string | null;
  externalProductId?: string | null;
  designFiles?: Array<{ placement: string; url: string }>;
  providerData?: Record<string, unknown>;
}

export interface MigrationResult {
  variantsMigrated: number;
  variantsSkipped: number;
  assetsCreated: number;
  luluBooksSeeded: number;
  errors: Array<{ productId?: string; variantId?: string; error: string }>;
}

export function isOldFormat(config: unknown): config is OldFulfillmentConfig {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  return 'externalVariantId' in c || 'externalProductId' in c || 'providerData' in c || 'designFiles' in c;
}

export function isAlreadyMigrated(config: unknown): config is FulfillmentConfig {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  return 'providerName' in c && 'providerConfig' in c && 'files' in c;
}

export function migrateVariantConfig(
  oldConfig: OldFulfillmentConfig,
  providerName: string,
): FulfillmentConfig {
  const providerConfig: Record<string, unknown> = (oldConfig.providerData && typeof oldConfig.providerData === 'object')
    ? { ...oldConfig.providerData }
    : {};

  if (providerName === 'printful') {
    if (oldConfig.externalVariantId && !('catalogVariantId' in providerConfig)) {
      providerConfig.catalogVariantId = parseInt(oldConfig.externalVariantId, 10);
    }
    if (oldConfig.externalProductId && !('catalogProductId' in providerConfig)) {
      providerConfig.catalogProductId = parseInt(oldConfig.externalProductId, 10);
    }
  }

  const files: FulfillmentFile[] = (oldConfig.designFiles || []).map((df) => ({
    assetId: `migrated-${df.placement || 'default'}-${Buffer.from(df.url).toString('base64url').slice(0, 24)}`,
    url: df.url,
    slot: df.placement || undefined,
  }));

  return {
    providerName,
    providerConfig,
    files,
  };
}

export function extractAssetUrls(
  variants: Array<{ fulfillmentConfig: unknown }>,
): Map<string, { url: string; type: string }> {
  const assetMap = new Map<string, { url: string; type: string }>();

  for (const variant of variants) {
    const config = variant.fulfillmentConfig;
    if (!config || typeof config !== 'object') continue;

    const c = config as Record<string, unknown>;

    const designFiles = (c as OldFulfillmentConfig).designFiles;
    if (Array.isArray(designFiles)) {
      for (const df of designFiles) {
        if (df.url && !assetMap.has(df.url)) {
          assetMap.set(df.url, {
            url: df.url,
            type: 'image',
          });
        }
      }
    }

    const files = (c as FulfillmentConfig).files;
    if (Array.isArray(files)) {
      for (const f of files) {
        if (f.url && !assetMap.has(f.url)) {
          assetMap.set(f.url, {
            url: f.url,
            type: 'image',
          });
        }
      }
    }
  }

  return assetMap;
}
