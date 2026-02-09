CREATE TABLE "newsletter_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscriptions_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "newsletter_email_idx" ON "newsletter_subscriptions" USING btree ("email");--> statement-breakpoint
CREATE INDEX "newsletter_active_idx" ON "newsletter_subscriptions" USING btree ("active");