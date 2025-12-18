#!/usr/bin/env bun
/**
 * Sync Database
 *
 * This script fetches all products from the live API and syncs them
 * to the local database (Turso or local SQLite) for development purposes.
 *
 * Usage: bun run db:sync
 *
 * Environment variables:
 *   DATABASE_URL - The database URL (libsql:// for Turso, file: for local SQLite)
 *   DATABASE_AUTH_TOKEN - Auth token for Turso (optional for local SQLite)
 */

import { createClient, type Client } from "@libsql/client";
import { config } from "dotenv";
import path from "path";

// Load env from host directory
config({ path: path.join(import.meta.dir, "../host/.env") });

const API_URL = "https://near.everything.market/api/products";

function getDatabaseClient(): Client {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!url) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  console.log(`   Database: ${url}`);

  return createClient({
    url,
    authToken: authToken || undefined,
  });
}

interface ProductImage {
  id: string;
  url: string;
  type: string;
  placement?: string;
  style?: string;
  variantIds?: string[];
  order?: number;
}

interface ProductVariant {
  id: string;
  title: string;
  sku?: string;
  price: number;
  currency?: string;
  attributes: Array<{ name: string; value: string }>;
  externalVariantId?: string;
  fulfillmentConfig?: Record<string, unknown>;
  availableForSale?: boolean;
}

interface ProductOption {
  id: string;
  name: string;
  values: string[];
  position: number;
}

interface Product {
  id: string;
  title: string;
  handle?: string;
  description?: string;
  price: number;
  currency?: string;
  category: string;
  brand?: string;
  productType?: string;
  options?: ProductOption[];
  images?: ProductImage[];
  variants?: ProductVariant[];
  thumbnailImage?: string;
  fulfillmentProvider?: string;
  externalProductId?: string;
  source?: string;
  tags?: string[];
}

interface ProductsResponse {
  products: Product[];
  total: number;
}

async function fetchProducts(): Promise<Product[]> {
  console.log("📡 Fetching products from API...");

  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
  }

  const data: ProductsResponse = await response.json();
  console.log(`✅ Fetched ${data.products.length} products`);

  return data.products;
}

async function initializeDatabase(db: Client): Promise<void> {
  // Tables should already exist from db:push, but create them just in case
  await db.batch([
    `CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      category TEXT NOT NULL,
      brand TEXT,
      product_type TEXT,
      options TEXT,
      thumbnail_image TEXT,
      fulfillment_provider TEXT NOT NULL,
      external_product_id TEXT,
      source TEXT NOT NULL,
      last_synced_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS product_images (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      url TEXT NOT NULL,
      type TEXT NOT NULL,
      placement TEXT,
      style TEXT,
      variant_ids TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sku TEXT,
      price INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      attributes TEXT,
      external_variant_id TEXT,
      fulfillment_config TEXT,
      in_stock INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS category_idx ON products(category)`,
    `CREATE INDEX IF NOT EXISTS source_idx ON products(source)`,
    `CREATE INDEX IF NOT EXISTS product_id_idx ON product_images(product_id)`,
    `CREATE INDEX IF NOT EXISTS variant_product_idx ON product_variants(product_id)`,
  ]);
}

async function syncProducts(db: Client, products: Product[]): Promise<void> {
  const now = Date.now();

  // Build batch statements for all operations
  const statements: Array<{ sql: string; args: unknown[] }> = [];

  for (const product of products) {
    // Delete existing images and variants first
    statements.push({
      sql: `DELETE FROM product_images WHERE product_id = ?`,
      args: [product.id],
    });
    statements.push({
      sql: `DELETE FROM product_variants WHERE product_id = ?`,
      args: [product.id],
    });

    // Insert/update product
    statements.push({
      sql: `INSERT OR REPLACE INTO products (
        id, name, description, price, currency, category, brand, product_type,
        options, thumbnail_image, fulfillment_provider, external_product_id,
        source, last_synced_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        product.id,
        product.title,
        product.description || null,
        Math.round(product.price * 100), // Convert to cents
        product.currency || "USD",
        product.category,
        product.brand || null,
        product.productType || null,
        product.options ? JSON.stringify(product.options) : null,
        product.thumbnailImage || null,
        product.fulfillmentProvider || "manual",
        product.externalProductId || null,
        product.source || "sync",
        now,
        now,
        now,
      ],
    });

    // Insert images
    if (product.images && product.images.length > 0) {
      for (const image of product.images) {
        statements.push({
          sql: `INSERT OR REPLACE INTO product_images (
            id, product_id, url, type, placement, style, variant_ids, "order", created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            image.id,
            product.id,
            image.url,
            image.type,
            image.placement || null,
            image.style || null,
            image.variantIds ? JSON.stringify(image.variantIds) : null,
            image.order || 0,
            now,
          ],
        });
      }
    }

    // Insert variants
    if (product.variants && product.variants.length > 0) {
      for (const variant of product.variants) {
        statements.push({
          sql: `INSERT OR REPLACE INTO product_variants (
            id, product_id, name, sku, price, currency, attributes,
            external_variant_id, fulfillment_config, in_stock, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            variant.id,
            product.id,
            variant.title,
            variant.sku || null,
            Math.round(variant.price * 100), // Convert to cents
            variant.currency || "USD",
            variant.attributes ? JSON.stringify(variant.attributes) : null,
            variant.externalVariantId || null,
            variant.fulfillmentConfig ? JSON.stringify(variant.fulfillmentConfig) : null,
            variant.availableForSale !== false ? 1 : 0,
            now,
          ],
        });
      }
    }
  }

  // Execute all statements in a batch (transactional)
  await db.batch(statements);
}

async function main(): Promise<void> {
  console.log("🔄 Starting database sync...\n");

  try {
    // Fetch products from API
    const products = await fetchProducts();

    if (products.length === 0) {
      console.log("⚠️  No products found. Skipping sync.");
      return;
    }

    // Connect to database
    console.log("\n💾 Connecting to database...");
    const db = getDatabaseClient();

    // Initialize tables if needed
    await initializeDatabase(db);

    // Sync products
    console.log(`\n📦 Syncing ${products.length} products to database...`);
    await syncProducts(db, products);

    // Get counts for summary
    const productCount = await db.execute("SELECT COUNT(*) as count FROM products");
    const imageCount = await db.execute("SELECT COUNT(*) as count FROM product_images");
    const variantCount = await db.execute("SELECT COUNT(*) as count FROM product_variants");

    console.log("\n✅ Sync completed successfully!");
    console.log(`   📦 Products: ${productCount.rows[0]?.count ?? 0}`);
    console.log(`   🖼️  Images: ${imageCount.rows[0]?.count ?? 0}`);
    console.log(`   🏷️  Variants: ${variantCount.rows[0]?.count ?? 0}`);

    db.close();

  } catch (error) {
    console.error("\n❌ Sync failed:", error);
    process.exit(1);
  }
}

main();
