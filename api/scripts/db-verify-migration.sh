#!/usr/bin/env bash
set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-nearmerchcom-api-db-1}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-api}"

PSQL="docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME"

echo "=== Migration Verification ==="
echo "Container: $DB_CONTAINER"
echo "Database: $DB_NAME"
echo ""

echo "--- 1. Schema: assets table exists? ---"
$PSQL -c "SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assets');" 2>/dev/null

echo ""
echo "--- 2. Schema: asset_id column on products? ---"
$PSQL -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'asset_id';" 2>/dev/null

echo ""
echo "--- 3. Data: Old-format fulfillment_config remaining? ---"
$PSQL -c "SELECT count(*) as old_format_count FROM product_variants WHERE fulfillment_config::text LIKE '%externalVariantId%' OR fulfillment_config::text LIKE '%designFiles%' OR fulfillment_config::text LIKE '%providerData%';" 2>/dev/null

echo ""
echo "--- 4. Data: New-format fulfillment_config samples ---"
$PSQL -c "SELECT id, product_id, jsonb_pretty(fulfillment_config) as config FROM product_variants WHERE fulfillment_config IS NOT NULL AND fulfillment_config::text LIKE '%providerName%' LIMIT 2;" 2>/dev/null

echo ""
echo "--- 5. Data: assets count ---"
$PSQL -c "SELECT count(*) as total_assets FROM assets;" 2>/dev/null

echo ""
echo "--- 6. Data: Sample assets ---"
$PSQL -c "SELECT id, url, type, name FROM assets LIMIT 5;" 2>/dev/null

echo ""
echo "--- 7. Data: Product provider breakdown ---"
$PSQL -c "SELECT fulfillment_provider, count(*) as product_count FROM products GROUP BY fulfillment_provider;" 2>/dev/null

echo ""
echo "--- 8. Data: Lulu products (seeded by migration?) ---"
$PSQL -c "SELECT id, name, fulfillment_provider FROM products WHERE fulfillment_provider = 'lulu';" 2>/dev/null

echo ""
echo "--- 9. Data: Variant config format summary ---"
$PSQL -c "SELECT count(*) as total_with_config, count(CASE WHEN fulfillment_config::text LIKE '%providerName%' THEN 1 END) as new_format, count(CASE WHEN fulfillment_config IS NULL THEN 1 END) as null_config FROM product_variants;" 2>/dev/null

echo ""
echo "=== Verification Complete ==="