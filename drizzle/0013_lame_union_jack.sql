CREATE TABLE "session_category_mastery_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"question_type" "question_type" NOT NULL,
	"rating_before" integer NOT NULL,
	"rating_after" integer NOT NULL,
	"rating_delta" integer NOT NULL,
	"rated_questions" integer NOT NULL,
	"correct_answers" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_category_mastery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"question_type" "question_type" NOT NULL,
	"rating" integer DEFAULT 0 NOT NULL,
	"total_questions" integer DEFAULT 0 NOT NULL,
	"correct_answers" integer DEFAULT 0 NOT NULL,
	"total_sessions" integer DEFAULT 0 NOT NULL,
	"rating_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session_category_mastery_changes" ADD CONSTRAINT "session_category_mastery_changes_session_id_challenge_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."challenge_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_category_mastery_changes" ADD CONSTRAINT "session_category_mastery_changes_user_id_users_profile_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_category_mastery" ADD CONSTRAINT "user_category_mastery_user_id_users_profile_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "session_category_mastery_changes_session_type_uidx" ON "session_category_mastery_changes" USING btree ("session_id","question_type");--> statement-breakpoint
CREATE INDEX "session_category_mastery_changes_session_id_idx" ON "session_category_mastery_changes" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_category_mastery_changes_user_id_idx" ON "session_category_mastery_changes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_category_mastery_user_type_uidx" ON "user_category_mastery" USING btree ("user_id","question_type");--> statement-breakpoint
CREATE INDEX "user_category_mastery_type_rating_idx" ON "user_category_mastery" USING btree ("question_type","rating" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "user_category_mastery_user_id_idx" ON "user_category_mastery" USING btree ("user_id");