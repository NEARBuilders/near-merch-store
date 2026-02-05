CREATE TABLE `product_types` (
	`slug` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`description` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
DROP INDEX `category_idx`;--> statement-breakpoint
ALTER TABLE `products` ADD `product_type_slug` text REFERENCES product_types(slug);--> statement-breakpoint
ALTER TABLE `products` ADD `tags` text;--> statement-breakpoint
ALTER TABLE `products` ADD `featured` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `products_type_slug_idx` ON `products` (`product_type_slug`);--> statement-breakpoint
CREATE INDEX `featured_idx` ON `products` (`featured`);--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `category`;--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `product_type`;