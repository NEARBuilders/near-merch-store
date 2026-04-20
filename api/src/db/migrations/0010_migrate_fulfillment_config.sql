-- Migrate product_variants.fulfillment_config from old format to new format
-- Old: { externalVariantId, externalProductId, providerData, designFiles: [{placement, url}] }
-- New: { providerName, providerConfig: { catalogVariantId, catalogProductId, ... }, files: [{assetId, url, slot}] }

UPDATE product_variants pv
SET fulfillment_config = jsonb_build_object(
  'providerName', COALESCE(p.fulfillment_provider, 'printful'),
  'providerConfig',
    CASE
      WHEN COALESCE(p.fulfillment_provider, 'printful') = 'printful' THEN
        COALESCE(pv.fulfillment_config->'providerData', '{}')
        || CASE WHEN pv.fulfillment_config->>'externalVariantId' IS NOT NULL
            THEN jsonb_build_object('catalogVariantId', (pv.fulfillment_config->>'externalVariantId')::numeric)
            ELSE '{}' END
        || CASE WHEN pv.fulfillment_config->>'externalProductId' IS NOT NULL
            THEN jsonb_build_object('catalogProductId', (pv.fulfillment_config->>'externalProductId')::numeric)
            ELSE '{}' END
      ELSE COALESCE(pv.fulfillment_config->'providerData', '{}')
    END,
  'files', COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
      'assetId', 'migrated-' || COALESCE(df->>'placement', 'default'),
      'url', df->>'url',
      'slot', df->>'placement'
    )) FROM jsonb_array_elements(pv.fulfillment_config->'designFiles') df),
    '[]'
  )
)
FROM products p
WHERE pv.product_id = p.id
  AND pv.fulfillment_config IS NOT NULL
  AND (
    pv.fulfillment_config ? 'externalVariantId'
    OR pv.fulfillment_config ? 'externalProductId'
    OR pv.fulfillment_config ? 'providerData'
    OR pv.fulfillment_config ? 'designFiles'
  );--> statement-breakpoint

-- Migrate order_items.fulfillment_config from old format to new format
UPDATE order_items oi
SET fulfillment_config = jsonb_build_object(
  'providerName', COALESCE(oi.fulfillment_provider, 'printful'),
  'providerConfig',
    CASE
      WHEN COALESCE(oi.fulfillment_provider, 'printful') = 'printful' THEN
        COALESCE(oi.fulfillment_config->'providerData', '{}')
        || CASE WHEN oi.fulfillment_config->>'externalVariantId' IS NOT NULL
            THEN jsonb_build_object('catalogVariantId', (oi.fulfillment_config->>'externalVariantId')::numeric)
            ELSE '{}' END
        || CASE WHEN oi.fulfillment_config->>'externalProductId' IS NOT NULL
            THEN jsonb_build_object('catalogProductId', (oi.fulfillment_config->>'externalProductId')::numeric)
            ELSE '{}' END
      ELSE COALESCE(oi.fulfillment_config->'providerData', '{}')
    END,
  'files', COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
      'assetId', 'migrated-' || COALESCE(df->>'placement', 'default'),
      'url', df->>'url',
      'slot', df->>'placement'
    )) FROM jsonb_array_elements(oi.fulfillment_config->'designFiles') df),
    '[]'
  )
)
WHERE oi.fulfillment_config IS NOT NULL
  AND (
    oi.fulfillment_config ? 'externalVariantId'
    OR oi.fulfillment_config ? 'externalProductId'
    OR oi.fulfillment_config ? 'providerData'
    OR oi.fulfillment_config ? 'designFiles'
  );