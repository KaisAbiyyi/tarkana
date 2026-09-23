CREATE TABLE "shared_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" varchar(32) NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shared_results" ADD CONSTRAINT "shared_results_session_id_challenge_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."challenge_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_results" ADD CONSTRAINT "shared_results_user_id_users_profile_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "shared_results_public_id_uidx" ON "shared_results" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "shared_results_session_id_idx" ON "shared_results" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "shared_results_user_id_idx" ON "shared_results" USING btree ("user_id");