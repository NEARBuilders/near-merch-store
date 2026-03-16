ALTER TABLE "products" ADD COLUMN "exclusive" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
CREATE INDEX "exclusive_idx" ON "products" USING btree ("exclusive");
