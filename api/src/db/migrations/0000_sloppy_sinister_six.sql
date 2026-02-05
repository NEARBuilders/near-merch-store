CREATE TABLE "collections" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"image" text,
	"badge" text,
	"featured_product_id" text,
	"carousel_title" text,
	"carousel_description" text,
	"show_in_carousel" boolean DEFAULT true NOT NULL,
	"carousel_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"variant_id" text,
	"product_name" text NOT NULL,
	"variant_name" text,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL,
	"attributes" jsonb,
	"fulfillment_provider" text,
	"fulfillment_config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_amount" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"checkout_session_id" text,
	"checkout_provider" text,
	"draft_order_ids" jsonb,
	"payment_details" jsonb,
	"shipping_method" text,
	"shipping_address" jsonb,
	"fulfillment_order_id" text,
	"fulfillment_reference_id" text,
	"tracking_info" jsonb,
	"delivery_estimate" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_collections" (
	"product_id" text NOT NULL,
	"collection_slug" text NOT NULL,
	CONSTRAINT "product_collections_product_id_collection_slug_pk" PRIMARY KEY("product_id","collection_slug")
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"url" text NOT NULL,
	"type" text NOT NULL,
	"placement" text,
	"style" text,
	"variant_ids" jsonb,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_types" (
	"slug" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"sku" text,
	"price" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"attributes" jsonb,
	"external_variant_id" text,
	"fulfillment_config" jsonb,
	"in_stock" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"public_key" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"brand" text,
	"product_type_slug" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"options" jsonb,
	"thumbnail_image" text,
	"featured" boolean DEFAULT false NOT NULL,
	"fulfillment_provider" text NOT NULL,
	"external_product_id" text,
	"source" text NOT NULL,
	"last_synced_at" timestamp with time zone,
	"listed" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_public_key_unique" UNIQUE("public_key"),
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "provider_configs" (
	"provider" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"webhook_url" text,
	"webhook_url_override" text,
	"enabled_events" jsonb,
	"public_key" text,
	"secret_key" text,
	"last_configured_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_state" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"last_success_at" timestamp with time zone,
	"last_error_at" timestamp with time zone,
	"error_message" text
);
--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_featured_product_id_products_id_fk" FOREIGN KEY ("featured_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_collections" ADD CONSTRAINT "product_collections_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_collections" ADD CONSTRAINT "product_collections_collection_slug_collections_slug_fk" FOREIGN KEY ("collection_slug") REFERENCES "public"."collections"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_product_type_slug_product_types_slug_fk" FOREIGN KEY ("product_type_slug") REFERENCES "public"."product_types"("slug") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collections_carousel_idx" ON "collections" USING btree ("show_in_carousel","carousel_order");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "order_items_variant_idx" ON "order_items" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "orders_user_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_checkout_session_idx" ON "orders" USING btree ("checkout_session_id");--> statement-breakpoint
CREATE INDEX "orders_fulfillment_ref_idx" ON "orders" USING btree ("fulfillment_reference_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pc_product_idx" ON "product_collections" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "pc_collection_idx" ON "product_collections" USING btree ("collection_slug");--> statement-breakpoint
CREATE INDEX "product_id_idx" ON "product_images" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "type_idx" ON "product_images" USING btree ("type");--> statement-breakpoint
CREATE INDEX "variant_product_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "variant_sku_idx" ON "product_variants" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "variant_external_idx" ON "product_variants" USING btree ("external_variant_id");--> statement-breakpoint
CREATE INDEX "source_idx" ON "products" USING btree ("source");--> statement-breakpoint
CREATE INDEX "external_product_idx" ON "products" USING btree ("external_product_id");--> statement-breakpoint
CREATE INDEX "fulfillment_provider_idx" ON "products" USING btree ("fulfillment_provider");--> statement-breakpoint
CREATE INDEX "listed_idx" ON "products" USING btree ("listed");--> statement-breakpoint
CREATE INDEX "public_key_idx" ON "products" USING btree ("public_key");--> statement-breakpoint
CREATE INDEX "slug_idx" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "external_provider_idx" ON "products" USING btree ("external_product_id","fulfillment_provider");--> statement-breakpoint
CREATE INDEX "products_type_slug_idx" ON "products" USING btree ("product_type_slug");--> statement-breakpoint
CREATE INDEX "featured_idx" ON "products" USING btree ("featured");