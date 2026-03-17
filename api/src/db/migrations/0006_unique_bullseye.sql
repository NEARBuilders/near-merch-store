DROP INDEX "exclusive_idx";--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "is_exclusive" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "exclusive_check_plugin_id" text;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "exclusive_check_config" jsonb;--> statement-breakpoint
CREATE INDEX "collections_exclusive_idx" ON "collections" USING btree ("is_exclusive");--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "exclusive";