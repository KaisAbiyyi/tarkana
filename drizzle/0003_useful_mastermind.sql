ALTER TABLE "challenge_sessions" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "challenge_sessions" ALTER COLUMN "status" SET DEFAULT 'created'::text;--> statement-breakpoint
DROP TYPE "public"."session_status";--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('created', 'in_progress', 'completed', 'abandoned');--> statement-breakpoint
ALTER TABLE "challenge_sessions" ALTER COLUMN "status" SET DEFAULT 'created'::"public"."session_status";--> statement-breakpoint
ALTER TABLE "challenge_sessions" ALTER COLUMN "status" SET DATA TYPE "public"."session_status" USING "status"::"public"."session_status";--> statement-breakpoint
DROP INDEX "challenge_sessions_user_status_idx";--> statement-breakpoint
ALTER TABLE "users_profile" ADD COLUMN "avatar_url" text;--> statement-breakpoint
CREATE INDEX "challenge_sessions_user_status_created_idx" ON "challenge_sessions" USING btree ("user_id","status","created_at");