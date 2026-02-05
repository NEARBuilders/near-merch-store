-- Add tags array and featured boolean to products table
-- Remove category column (productType already exists and is the proper field for product types)

ALTER TABLE `products` ADD COLUMN `tags` text;
ALTER TABLE `products` ADD COLUMN `featured` integer DEFAULT false NOT NULL;

-- Add indexes for new columns
CREATE INDEX `products_featured_idx` ON `products` (`featured`);
CREATE INDEX `products_product_type_idx` ON `products` (`product_type`);

-- Drop the old category index and column
DROP INDEX IF EXISTS `category_idx`;
