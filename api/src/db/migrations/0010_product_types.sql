-- Create product_types table
CREATE TABLE IF NOT EXISTS product_types (
  slug TEXT PRIMARY KEY NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Seed initial product types
INSERT INTO product_types (slug, label, description, display_order, created_at, updated_at) VALUES
  ('tshirt', 'T-Shirts', 'Short-sleeved t-shirts and tees', 1, strftime('%s', 'now'), strftime('%s', 'now')),
  ('hats', 'Hats', 'Hats, caps, and beanies', 2, strftime('%s', 'now'), strftime('%s', 'now')),
  ('hoodies', 'Hoodies', 'Hooded sweatshirts', 3, strftime('%s', 'now'), strftime('%s', 'now')),
  ('long-sleeved-shirts', 'Long Sleeved Shirts', 'Long-sleeved shirts and tops', 4, strftime('%s', 'now'), strftime('%s', 'now'));

-- Add product_type_slug column to products table (foreign key to product_types)
ALTER TABLE products ADD COLUMN product_type_slug TEXT REFERENCES product_types(slug) ON DELETE SET NULL;

-- Create index for product_type_slug on products
CREATE INDEX IF NOT EXISTS products_type_slug_idx ON products(product_type_slug);

-- Migrate existing product_type strings to new product_type_slug
-- T-shirts
UPDATE products SET product_type_slug = 'tshirt' 
WHERE product_type IS NOT NULL 
  AND (LOWER(product_type) LIKE '%t-shirt%' 
    OR LOWER(product_type) LIKE '%tshirt%' 
    OR LOWER(product_type) LIKE '%tee%');

-- Hats
UPDATE products SET product_type_slug = 'hats' 
WHERE product_type IS NOT NULL 
  AND product_type_slug IS NULL
  AND (LOWER(product_type) LIKE '%hat%' 
    OR LOWER(product_type) LIKE '%cap%' 
    OR LOWER(product_type) LIKE '%beanie%');

-- Hoodies
UPDATE products SET product_type_slug = 'hoodies' 
WHERE product_type IS NOT NULL 
  AND product_type_slug IS NULL
  AND (LOWER(product_type) LIKE '%hoodie%' 
    OR LOWER(product_type) LIKE '%hoody%');

-- Long sleeved shirts
UPDATE products SET product_type_slug = 'long-sleeved-shirts' 
WHERE product_type IS NOT NULL 
  AND product_type_slug IS NULL
  AND (LOWER(product_type) LIKE '%long sleeve%' 
    OR LOWER(product_type) LIKE '%long-sleeve%' 
    OR LOWER(product_type) LIKE '%longsleeve%');

-- Drop the old product_type column
ALTER TABLE products DROP COLUMN product_type;

-- Drop the old product_type index (if exists)
DROP INDEX IF EXISTS product_type_idx;
