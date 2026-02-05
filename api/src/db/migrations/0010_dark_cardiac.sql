ALTER TABLE `collections` ADD `badge` text;--> statement-breakpoint
ALTER TABLE `collections` ADD `featured_product_id` text REFERENCES products(id);--> statement-breakpoint
ALTER TABLE `collections` ADD `carousel_title` text;--> statement-breakpoint
ALTER TABLE `collections` ADD `carousel_description` text;--> statement-breakpoint
ALTER TABLE `collections` ADD `show_in_carousel` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `collections` ADD `carousel_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `collections_carousel_idx` ON `collections` (`show_in_carousel`,`carousel_order`);