ALTER TABLE "assets" ADD COLUMN "storage_key" text;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "size" integer;--> statement-breakpoint
CREATE INDEX "assets_storage_key_idx" ON "assets" USING btree ("storage_key");