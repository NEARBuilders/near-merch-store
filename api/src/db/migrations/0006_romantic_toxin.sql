-- Add columns with defaults for existing rows (will be populated by sync)
-- Note: Unique indexes deferred - run sync first to populate values, then add unique constraints
ALTER TABLE `products` ADD `public_key` text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `products` ADD `slug` text NOT NULL DEFAULT '';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `public_key_idx` ON `products` (`public_key`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `slug_idx` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `external_provider_idx` ON `products` (`external_product_id`,`fulfillment_provider`);
