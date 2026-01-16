ALTER TABLE `products` ADD `tags` text DEFAULT '[]' NOT NULL;
ALTER TABLE `products` ADD `group_id` text;
CREATE INDEX `group_id_idx` ON `products` (`group_id`);