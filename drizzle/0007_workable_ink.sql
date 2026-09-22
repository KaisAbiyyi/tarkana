CREATE TABLE "daily_challenge_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"daily_challenge_id" uuid NOT NULL,
	"session_id" uuid,
	"user_id" uuid,
	"guest_token_hash" varchar(64),
	"distinct_id" varchar(64) NOT NULL,
	"is_official" boolean DEFAULT true NOT NULL,
	"status" "session_status" DEFAULT 'in_progress' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"accuracy" double precision DEFAULT 0 NOT NULL,
	"total_time_seconds" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "daily_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_date" varchar(10) NOT NULL,
	"config_version" integer DEFAULT 1 NOT NULL,
	"generator_version" integer DEFAULT 1 NOT NULL,
	"seed" varchar(128) NOT NULL,
	"total_questions" integer DEFAULT 10 NOT NULL,
	"puzzle_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "challenge_sessions" ADD COLUMN "daily_challenge_id" uuid;--> statement-breakpoint
ALTER TABLE "daily_challenge_attempts" ADD CONSTRAINT "daily_challenge_attempts_daily_challenge_id_daily_challenges_id_fk" FOREIGN KEY ("daily_challenge_id") REFERENCES "public"."daily_challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_challenge_attempts" ADD CONSTRAINT "daily_challenge_attempts_session_id_challenge_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."challenge_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_challenge_attempts" ADD CONSTRAINT "daily_challenge_attempts_user_id_users_profile_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_attempts_challenge_id_idx" ON "daily_challenge_attempts" USING btree ("daily_challenge_id");--> statement-breakpoint
CREATE INDEX "daily_attempts_user_id_idx" ON "daily_challenge_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "daily_attempts_guest_token_hash_idx" ON "daily_challenge_attempts" USING btree ("guest_token_hash");--> statement-breakpoint
CREATE INDEX "daily_attempts_distinct_id_idx" ON "daily_challenge_attempts" USING btree ("distinct_id");--> statement-breakpoint
CREATE INDEX "daily_attempts_session_id_idx" ON "daily_challenge_attempts" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_attempts_user_official_uidx" ON "daily_challenge_attempts" USING btree ("daily_challenge_id","user_id") WHERE user_id IS NOT NULL AND is_official = true;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_attempts_guest_official_uidx" ON "daily_challenge_attempts" USING btree ("daily_challenge_id","guest_token_hash") WHERE guest_token_hash IS NOT NULL AND is_official = true;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_challenges_challenge_date_uidx" ON "daily_challenges" USING btree ("challenge_date");--> statement-breakpoint
CREATE INDEX "daily_challenges_config_version_idx" ON "daily_challenges" USING btree ("config_version","generator_version");--> statement-breakpoint
ALTER TABLE "challenge_sessions" ADD CONSTRAINT "challenge_sessions_daily_challenge_id_daily_challenges_id_fk" FOREIGN KEY ("daily_challenge_id") REFERENCES "public"."daily_challenges"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "challenge_sessions_daily_challenge_id_idx" ON "challenge_sessions" USING btree ("daily_challenge_id");