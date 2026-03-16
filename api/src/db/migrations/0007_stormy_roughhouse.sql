DROP INDEX "collections_exclusive_idx";--> statement-breakpoint
ALTER TABLE "collections" DROP COLUMN "is_exclusive";--> statement-breakpoint
ALTER TABLE "collections" DROP COLUMN "exclusive_check_plugin_id";--> statement-breakpoint
ALTER TABLE "collections" DROP COLUMN "exclusive_check_config";