CREATE TYPE "public"."challenge_type" AS ENUM('quick', 'standard', 'long', 'daily', 'custom', 'mixed', 'mode');--> statement-breakpoint
CREATE TYPE "public"."difficulty_band" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('number_sequence', 'symbol_pattern', 'mini_deduction', 'memory_pattern');--> statement-breakpoint
CREATE TYPE "public"."rank_name" AS ENUM('Unranked', 'Bronze Mind', 'Silver Solver', 'Gold Analyst', 'Platinum Strategist', 'Diamond Reasoner', 'Mastermind');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('created', 'in_progress', 'completed', 'abandoned', 'suspicious');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"action" varchar(120) NOT NULL,
	"entity_type" varchar(120) NOT NULL,
	"entity_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenge_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"challenge_type" "challenge_type" NOT NULL,
	"question_count" integer NOT NULL,
	"mode_distribution" jsonb,
	"difficulty_distribution" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenge_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"challenge_type" "challenge_type" NOT NULL,
	"status" "session_status" DEFAULT 'created' NOT NULL,
	"total_questions" integer NOT NULL,
	"total_score" integer DEFAULT 0 NOT NULL,
	"accuracy" double precision DEFAULT 0 NOT NULL,
	"total_time_seconds" integer DEFAULT 0 NOT NULL,
	"average_time_seconds" double precision DEFAULT 0 NOT NULL,
	"rating_before" integer DEFAULT 0 NOT NULL,
	"rating_after" integer DEFAULT 0 NOT NULL,
	"rating_delta" integer DEFAULT 0 NOT NULL,
	"rank_before" "rank_name" DEFAULT 'Unranked' NOT NULL,
	"rank_after" "rank_name" DEFAULT 'Unranked' NOT NULL,
	"is_suspicious" boolean DEFAULT false NOT NULL,
	"suspicious_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "question_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"rule_type" varchar(120) NOT NULL,
	"difficulty_min" integer NOT NULL,
	"difficulty_max" integer NOT NULL,
	"difficulty_band" "difficulty_band",
	"time_limit_seconds" integer NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_question_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"selected_answer" text NOT NULL,
	"is_correct" boolean NOT NULL,
	"time_spent_seconds" integer NOT NULL,
	"score_earned" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"question_type" "question_type" NOT NULL,
	"category_id" uuid NOT NULL,
	"prompt" text NOT NULL,
	"choices" jsonb NOT NULL,
	"correct_answer" text NOT NULL,
	"explanation" text NOT NULL,
	"difficulty_score" integer NOT NULL,
	"time_limit_seconds" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"generated_seed" varchar(240) NOT NULL,
	"order_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users_profile" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(120),
	"display_name" varchar(32) NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"rating" integer DEFAULT 0 NOT NULL,
	"rank" "rank_name" DEFAULT 'Unranked' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_admin_user_id_users_profile_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users_profile"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_sessions" ADD CONSTRAINT "challenge_sessions_user_id_users_profile_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_rules" ADD CONSTRAINT "question_rules_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_answers" ADD CONSTRAINT "session_answers_session_question_id_session_questions_id_fk" FOREIGN KEY ("session_question_id") REFERENCES "public"."session_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_answers" ADD CONSTRAINT "session_answers_user_id_users_profile_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_questions" ADD CONSTRAINT "session_questions_session_id_challenge_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."challenge_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_questions" ADD CONSTRAINT "session_questions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_log_admin_user_id_idx" ON "admin_audit_log" USING btree ("admin_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_uidx" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "challenge_configs_challenge_type_idx" ON "challenge_configs" USING btree ("challenge_type");--> statement-breakpoint
CREATE INDEX "challenge_configs_is_active_idx" ON "challenge_configs" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "challenge_sessions_user_id_idx" ON "challenge_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "challenge_sessions_created_at_idx" ON "challenge_sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "challenge_sessions_is_suspicious_idx" ON "challenge_sessions" USING btree ("is_suspicious");--> statement-breakpoint
CREATE INDEX "challenge_sessions_user_status_idx" ON "challenge_sessions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "question_rules_category_id_idx" ON "question_rules" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "question_rules_is_active_idx" ON "question_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "question_rules_rule_type_idx" ON "question_rules" USING btree ("rule_type");--> statement-breakpoint
CREATE INDEX "session_answers_session_question_id_idx" ON "session_answers" USING btree ("session_question_id");--> statement-breakpoint
CREATE INDEX "session_answers_user_id_idx" ON "session_answers" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_answers_question_user_uidx" ON "session_answers" USING btree ("session_question_id","user_id");--> statement-breakpoint
CREATE INDEX "session_questions_session_id_idx" ON "session_questions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_questions_order_index_idx" ON "session_questions" USING btree ("order_index");--> statement-breakpoint
CREATE UNIQUE INDEX "session_questions_session_order_uidx" ON "session_questions" USING btree ("session_id","order_index");--> statement-breakpoint
CREATE INDEX "users_profile_display_name_idx" ON "users_profile" USING btree ("display_name");--> statement-breakpoint
CREATE INDEX "users_profile_rating_idx" ON "users_profile" USING btree ("rating");