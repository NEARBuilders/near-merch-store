ALTER TABLE "orders" ADD COLUMN "subtotal" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_cost" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tax_amount" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tax_required" boolean;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tax_rate" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tax_shipping_taxable" boolean;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tax_exempt" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_tax_id" text;