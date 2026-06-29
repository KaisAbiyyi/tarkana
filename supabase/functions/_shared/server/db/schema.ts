import { sql } from 'drizzle-orm';
import {
	boolean,
	doublePrecision,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar
} from 'drizzle-orm/pg-core';
import { USER_ROLES } from '../../shared/constants/auth.ts';
import {
	CHALLENGE_TYPES,
	DIFFICULTY_BANDS,
	QUESTION_TYPES,
	SESSION_STATUSES
} from '../../shared/constants/challenge.ts';
import { RANK_NAMES } from '../../shared/constants/rank.ts';

export const userRoleEnum = pgEnum('user_role', USER_ROLES);
export const questionTypeEnum = pgEnum('question_type', QUESTION_TYPES);
export const challengeTypeEnum = pgEnum('challenge_type', CHALLENGE_TYPES);
export const sessionStatusEnum = pgEnum('session_status', SESSION_STATUSES);
export const difficultyBandEnum = pgEnum('difficulty_band', DIFFICULTY_BANDS);
export const rankNameEnum = pgEnum('rank_name', RANK_NAMES);

const now = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
	timestamp('updated_at', { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date());

export const usersProfile = pgTable(
	'users_profile',
	{
		id: uuid('id').primaryKey(),
		name: varchar('name', { length: 120 }),
		displayName: varchar('display_name', { length: 32 }).notNull(),
		avatarUrl: text('avatar_url'),

		role: userRoleEnum('role').notNull().default('user'),
		rating: integer('rating').notNull().default(0),
		rank: rankNameEnum('rank').notNull().default('Unranked'),
		createdAt: now(),
		updatedAt: updatedAt()
	},
	(table) => [
		index('users_profile_display_name_idx').on(table.displayName),
		index('users_profile_rating_idx').on(table.rating)
	]
);

export const categories = pgTable(
	'categories',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		name: varchar('name', { length: 120 }).notNull(),
		slug: varchar('slug', { length: 120 }).notNull(),
		description: text('description'),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: now(),
		updatedAt: updatedAt()
	},
	(table) => [uniqueIndex('categories_slug_uidx').on(table.slug)]
);

export const questionRules = pgTable(
	'question_rules',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		categoryId: uuid('category_id')
			.notNull()
			.references(() => categories.id, { onDelete: 'restrict' }),
		ruleType: varchar('rule_type', { length: 120 }).notNull(),
		difficultyMin: integer('difficulty_min').notNull(),
		difficultyMax: integer('difficulty_max').notNull(),
		difficultyBand: difficultyBandEnum('difficulty_band'),
		timeLimitSeconds: integer('time_limit_seconds').notNull(),
		config: jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: now(),
		updatedAt: updatedAt()
	},
	(table) => [
		index('question_rules_category_id_idx').on(table.categoryId),
		index('question_rules_is_active_idx').on(table.isActive),
		index('question_rules_rule_type_idx').on(table.ruleType)
	]
);

export const challengeConfigs = pgTable(
	'challenge_configs',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		name: varchar('name', { length: 120 }).notNull(),
		challengeType: challengeTypeEnum('challenge_type').notNull(),
		questionCount: integer('question_count').notNull(),
		modeDistribution: jsonb('mode_distribution').$type<Record<string, unknown> | null>(),
		difficultyDistribution: jsonb('difficulty_distribution').$type<Record<
			string,
			unknown
		> | null>(),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: now(),
		updatedAt: updatedAt()
	},
	(table) => [
		index('challenge_configs_challenge_type_idx').on(table.challengeType),
		index('challenge_configs_is_active_idx').on(table.isActive)
	]
);

export const challengeSessions = pgTable(
	'challenge_sessions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => usersProfile.id, { onDelete: 'cascade' }),
		challengeType: challengeTypeEnum('challenge_type').notNull(),
		status: sessionStatusEnum('status').notNull().default('created'),
		totalQuestions: integer('total_questions').notNull(),
		totalScore: integer('total_score').notNull().default(0),
		accuracy: doublePrecision('accuracy').notNull().default(0),
		totalTimeSeconds: integer('total_time_seconds').notNull().default(0),
		averageTimeSeconds: doublePrecision('average_time_seconds').notNull().default(0),
		ratingBefore: integer('rating_before').notNull().default(0),
		ratingAfter: integer('rating_after').notNull().default(0),
		ratingDelta: integer('rating_delta').notNull().default(0),
		rankBefore: rankNameEnum('rank_before').notNull().default('Unranked'),
		rankAfter: rankNameEnum('rank_after').notNull().default('Unranked'),
		isSuspicious: boolean('is_suspicious').notNull().default(false),
		suspiciousReason: text('suspicious_reason'),
		createdAt: now(),
		updatedAt: updatedAt(),
		completedAt: timestamp('completed_at', { withTimezone: true })
	},
	(table) => [
		index('challenge_sessions_user_id_idx').on(table.userId),
		index('challenge_sessions_created_at_idx').on(table.createdAt),
		index('challenge_sessions_is_suspicious_idx').on(table.isSuspicious),
		index('challenge_sessions_user_status_idx').on(table.userId, table.status)
	]
);

export const sessionQuestions = pgTable(
	'session_questions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		sessionId: uuid('session_id')
			.notNull()
			.references(() => challengeSessions.id, { onDelete: 'cascade' }),
		questionType: questionTypeEnum('question_type').notNull(),
		categoryId: uuid('category_id')
			.notNull()
			.references(() => categories.id, { onDelete: 'restrict' }),
		prompt: text('prompt').notNull(),
		choices: jsonb('choices').$type<string[]>().notNull(),
		correctAnswer: text('correct_answer').notNull(),
		explanation: text('explanation').notNull(),
		difficultyScore: integer('difficulty_score').notNull(),
		timeLimitSeconds: integer('time_limit_seconds').notNull(),
		metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
		generatedSeed: varchar('generated_seed', { length: 240 }).notNull(),
		orderIndex: integer('order_index').notNull(),
		createdAt: now()
	},
	(table) => [
		index('session_questions_session_id_idx').on(table.sessionId),
		index('session_questions_order_index_idx').on(table.orderIndex),
		uniqueIndex('session_questions_session_order_uidx').on(table.sessionId, table.orderIndex)
	]
);

export const sessionAnswers = pgTable(
	'session_answers',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		sessionQuestionId: uuid('session_question_id')
			.notNull()
			.references(() => sessionQuestions.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => usersProfile.id, { onDelete: 'cascade' }),
		selectedAnswer: text('selected_answer').notNull(),
		isCorrect: boolean('is_correct').notNull(),
		timeSpentSeconds: integer('time_spent_seconds').notNull(),
		scoreEarned: integer('score_earned').notNull().default(0),
		createdAt: now()
	},
	(table) => [
		index('session_answers_session_question_id_idx').on(table.sessionQuestionId),
		index('session_answers_user_id_idx').on(table.userId),
		uniqueIndex('session_answers_question_user_uidx').on(table.sessionQuestionId, table.userId)
	]
);

export const adminAuditLog = pgTable(
	'admin_audit_log',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		adminUserId: uuid('admin_user_id')
			.notNull()
			.references(() => usersProfile.id, { onDelete: 'restrict' }),
		action: varchar('action', { length: 120 }).notNull(),
		entityType: varchar('entity_type', { length: 120 }).notNull(),
		entityId: uuid('entity_id'),
		metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
		createdAt: now()
	},
	(table) => [index('admin_audit_log_admin_user_id_idx').on(table.adminUserId)]
);

export const completedSessionStatusSql = sql`status = 'completed'`;

export type UserProfile = typeof usersProfile.$inferSelect;
export type NewUserProfile = typeof usersProfile.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type QuestionRule = typeof questionRules.$inferSelect;
export type NewQuestionRule = typeof questionRules.$inferInsert;
export type ChallengeConfig = typeof challengeConfigs.$inferSelect;
export type NewChallengeConfig = typeof challengeConfigs.$inferInsert;
export type ChallengeSession = typeof challengeSessions.$inferSelect;
export type NewChallengeSession = typeof challengeSessions.$inferInsert;
export type SessionQuestion = typeof sessionQuestions.$inferSelect;
export type NewSessionQuestion = typeof sessionQuestions.$inferInsert;
export type SessionAnswer = typeof sessionAnswers.$inferSelect;
export type NewSessionAnswer = typeof sessionAnswers.$inferInsert;
