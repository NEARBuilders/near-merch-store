CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`category` text NOT NULL,
	`image` text,
	`fulfillment_provider` text NOT NULL,
	`fulfillment_config` text,
	`source` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `category_idx` ON `products` (`category`);--> statement-breakpoint
CREATE INDEX `source_idx` ON `products` (`source`);--> statement-breakpoint
CREATE TABLE `sync_state` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`last_success_at` integer,
	`last_error_at` integer,
	`error_message` text
);
