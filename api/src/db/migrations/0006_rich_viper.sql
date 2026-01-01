ALTER TABLE `products` ADD `public_key` text;--> statement-breakpoint
ALTER TABLE `products` ADD `slug` text;--> statement-breakpoint
CREATE UNIQUE INDEX `products_public_key_unique` ON `products` (`public_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX `public_key_idx` ON `products` (`public_key`);--> statement-breakpoint
CREATE INDEX `slug_idx` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX `external_provider_idx` ON `products` (`external_product_id`,`fulfillment_provider`);