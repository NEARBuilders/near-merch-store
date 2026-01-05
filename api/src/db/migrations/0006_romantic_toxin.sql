-- Add columns only if they don't exist (SQLite doesn't support IF NOT EXISTS for ALTER TABLE)
-- Check if public_key column exists, if not add it
-- Note: This will fail if column exists, so we need to handle it manually first
ALTER TABLE `products` ADD `public_key` text NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `slug` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `products_public_key_unique` ON `products` (`public_key`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `products_slug_unique` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `public_key_idx` ON `products` (`public_key`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `slug_idx` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `external_provider_idx` ON `products` (`external_product_id`,`fulfillment_provider`);