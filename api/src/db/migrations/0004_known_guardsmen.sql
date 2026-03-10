CREATE TABLE "order_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"field" text,
	"old_value" text,
	"new_value" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "order_audit_logs" ADD CONSTRAINT "order_audit_logs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_order_idx" ON "order_audit_logs" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "order_audit_logs" USING btree ("actor");--> statement-breakpoint
CREATE INDEX "audit_action_idx" ON "order_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "order_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_deleted_idx" ON "orders" USING btree ("is_deleted");