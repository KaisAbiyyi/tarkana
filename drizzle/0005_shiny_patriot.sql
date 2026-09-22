DROP INDEX "session_answers_question_user_uidx";--> statement-breakpoint
ALTER TABLE "challenge_sessions" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "session_answers" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "challenge_sessions" ADD COLUMN "guest_token" varchar(64);--> statement-breakpoint
ALTER TABLE "challenge_sessions" ADD COLUMN "claimed_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "challenge_sessions_guest_token_idx" ON "challenge_sessions" USING btree ("guest_token");--> statement-breakpoint
CREATE UNIQUE INDEX "session_answers_question_uidx" ON "session_answers" USING btree ("session_question_id");