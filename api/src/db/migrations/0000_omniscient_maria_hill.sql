CREATE TABLE `collections` (
	`slug` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`variant_id` text,
	`product_name` text NOT NULL,
	`variant_name` text,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`attributes` text,
	`fulfillment_provider` text,
	`fulfillment_config` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_items_product_idx` ON `order_items` (`product_id`);--> statement-breakpoint
CREATE INDEX `order_items_variant_idx` ON `order_items` (`variant_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`total_amount` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`checkout_session_id` text,
	`checkout_provider` text,
	`shipping_method` text,
	`shipping_address` text,
	`fulfillment_order_id` text,
	`fulfillment_reference_id` text,
	`tracking_info` text,
	`delivery_estimate` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `orders_user_idx` ON `orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `orders_checkout_session_idx` ON `orders` (`checkout_session_id`);--> statement-breakpoint
CREATE INDEX `orders_fulfillment_ref_idx` ON `orders` (`fulfillment_reference_id`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE TABLE `product_collections` (
	`product_id` text NOT NULL,
	`collection_slug` text NOT NULL,
	PRIMARY KEY(`product_id`, `collection_slug`),
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`collection_slug`) REFERENCES `collections`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pc_product_idx` ON `product_collections` (`product_id`);--> statement-breakpoint
CREATE INDEX `pc_collection_idx` ON `product_collections` (`collection_slug`);--> statement-breakpoint
CREATE TABLE `product_images` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`url` text NOT NULL,
	`type` text NOT NULL,
	`placement` text,
	`style` text,
	`variant_ids` text,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_id_idx` ON `product_images` (`product_id`);--> statement-breakpoint
CREATE INDEX `type_idx` ON `product_images` (`type`);--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`sku` text,
	`price` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`attributes` text,
	`external_variant_id` text,
	`fulfillment_config` text,
	`in_stock` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `variant_product_idx` ON `product_variants` (`product_id`);--> statement-breakpoint
CREATE INDEX `variant_sku_idx` ON `product_variants` (`sku`);--> statement-breakpoint
CREATE INDEX `variant_external_idx` ON `product_variants` (`external_variant_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`category` text NOT NULL,
	`brand` text,
	`product_type` text,
	`primary_image` text,
	`fulfillment_provider` text NOT NULL,
	`external_product_id` text,
	`source` text NOT NULL,
	`mockup_config` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `category_idx` ON `products` (`category`);--> statement-breakpoint
CREATE INDEX `source_idx` ON `products` (`source`);--> statement-breakpoint
CREATE INDEX `external_product_idx` ON `products` (`external_product_id`);--> statement-breakpoint
CREATE INDEX `fulfillment_provider_idx` ON `products` (`fulfillment_provider`);--> statement-breakpoint
CREATE TABLE `sync_state` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`last_success_at` integer,
	`last_error_at` integer,
	`error_message` text
);
