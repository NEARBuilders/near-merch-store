ALTER TABLE `products` ADD `listed` integer DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX `listed_idx` ON `products` (`listed`);