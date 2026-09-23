ALTER TYPE "public"."challenge_type" ADD VALUE 'duel';--> statement-breakpoint
CREATE TABLE "challenge_duels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" varchar(32) NOT NULL,
	"creator_session_id" uuid NOT NULL,
	"creator_user_id" uuid,
	"creator_display_name" varchar(64) NOT NULL,
	"creator_score" integer NOT NULL,
	"creator_accuracy" double precision NOT NULL,
	"creator_total_time_seconds" integer NOT NULL,
	"source_challenge_type" "challenge_type" NOT NULL,
	"total_questions" integer NOT NULL,
	"puzzle_snapshot" jsonb NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "duel_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"duel_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid,
	"guest_token_hash" varchar(64),
	"display_name" varchar(64) NOT NULL,
	"status" "session_status" DEFAULT 'in_progress' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"accuracy" double precision DEFAULT 0 NOT NULL,
	"total_time_seconds" integer DEFAULT 0 NOT NULL,
	"is_suspicious" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "challenge_duels" ADD CONSTRAINT "challenge_duels_creator_session_id_challenge_sessions_id_fk" FOREIGN KEY ("creator_session_id") REFERENCES "public"."challenge_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_duels" ADD CONSTRAINT "challenge_duels_creator_user_id_users_profile_id_fk" FOREIGN KEY ("creator_user_id") REFERENCES "public"."users_profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duel_participants" ADD CONSTRAINT "duel_participants_duel_id_challenge_duels_id_fk" FOREIGN KEY ("duel_id") REFERENCES "public"."challenge_duels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duel_participants" ADD CONSTRAINT "duel_participants_session_id_challenge_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."challenge_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duel_participants" ADD CONSTRAINT "duel_participants_user_id_users_profile_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "challenge_duels_public_id_uidx" ON "challenge_duels" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "challenge_duels_creator_session_active_uidx" ON "challenge_duels" USING btree ("creator_session_id") WHERE is_revoked = false;--> statement-breakpoint
CREATE INDEX "challenge_duels_creator_session_id_idx" ON "challenge_duels" USING btree ("creator_session_id");--> statement-breakpoint
CREATE INDEX "challenge_duels_creator_user_id_idx" ON "challenge_duels" USING btree ("creator_user_id");--> statement-breakpoint
CREATE INDEX "challenge_duels_expires_at_idx" ON "challenge_duels" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "duel_participants_duel_id_idx" ON "duel_participants" USING btree ("duel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "duel_participants_session_id_uidx" ON "duel_participants" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "duel_participants_user_uidx" ON "duel_participants" USING btree ("duel_id","user_id") WHERE user_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "duel_participants_guest_uidx" ON "duel_participants" USING btree ("duel_id","guest_token_hash") WHERE guest_token_hash IS NOT NULL AND user_id IS NULL;