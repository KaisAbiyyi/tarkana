CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"distinct_id" varchar(64) NOT NULL,
	"user_id" uuid,
	"event" varchar(64) NOT NULL,
	"properties" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"anonymous_id" varchar(64) NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_profile_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_aliases" ADD CONSTRAINT "identity_aliases_user_id_users_profile_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_events_distinct_id_idx" ON "analytics_events" USING btree ("distinct_id");--> statement-breakpoint
CREATE INDEX "analytics_events_user_id_idx" ON "analytics_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "analytics_events_event_created_at_idx" ON "analytics_events" USING btree ("event","created_at");--> statement-breakpoint
CREATE INDEX "analytics_events_created_at_idx" ON "analytics_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "identity_aliases_anon_user_uidx" ON "identity_aliases" USING btree ("anonymous_id","user_id");--> statement-breakpoint
CREATE INDEX "identity_aliases_anon_id_idx" ON "identity_aliases" USING btree ("anonymous_id");--> statement-breakpoint
CREATE INDEX "identity_aliases_user_id_idx" ON "identity_aliases" USING btree ("user_id");