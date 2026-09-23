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
import { USER_ROLES } from '$lib/shared/constants/auth';
import {
	CHALLENGE_TYPES,
	DIFFICULTY_BANDS,
	QUESTION_TYPES,
	SESSION_STATUSES,
	type QuestionType
} from '$lib/shared/constants/challenge';
import { RANK_NAMES } from '$lib/shared/constants/rank';

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

export type DailyPuzzleSnapshotQuestion = {
	orderIndex: number;
	categoryId: string;
	questionType: QuestionType;
	prompt: string;
	choices: string[];
	correctAnswer: string;
	explanation: string;
	difficultyScore: number;
	timeLimitSeconds: number;
	metadata: Record<string, unknown>;
	generatedSeed: string;
};

export const dailyChallenges = pgTable(
	'daily_challenges',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		challengeDate: varchar('challenge_date', { length: 10 }).notNull(),
		configVersion: integer('config_version').notNull().default(1),
		generatorVersion: integer('generator_version').notNull().default(1),
		seed: varchar('seed', { length: 128 }).notNull(),
		totalQuestions: integer('total_questions').notNull().default(10),
		puzzleSnapshot: jsonb('puzzle_snapshot').$type<DailyPuzzleSnapshotQuestion[]>().notNull(),
		createdAt: now()
	},
	(table) => [
		uniqueIndex('daily_challenges_challenge_date_uidx').on(table.challengeDate),
		index('daily_challenges_config_version_idx').on(table.configVersion, table.generatorVersion)
	]
);

export const challengeSessions = pgTable(
	'challenge_sessions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id').references(() => usersProfile.id, { onDelete: 'cascade' }),
		guestToken: varchar('guest_token', { length: 64 }),
		dailyChallengeId: uuid('daily_challenge_id').references(() => dailyChallenges.id, {
			onDelete: 'set null'
		}),
		claimedAt: timestamp('claimed_at', { withTimezone: true }),
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
		index('challenge_sessions_guest_token_idx').on(table.guestToken),
		index('challenge_sessions_daily_challenge_id_idx').on(table.dailyChallengeId),
		index('challenge_sessions_created_at_idx').on(table.createdAt),
		index('challenge_sessions_is_suspicious_idx').on(table.isSuspicious),
		index('challenge_sessions_user_status_created_idx').on(
			table.userId,
			table.status,
			table.createdAt
		)
	]
);

export const dailyChallengeAttempts = pgTable(
	'daily_challenge_attempts',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		dailyChallengeId: uuid('daily_challenge_id')
			.notNull()
			.references(() => dailyChallenges.id, { onDelete: 'cascade' }),
		sessionId: uuid('session_id').references(() => challengeSessions.id, {
			onDelete: 'set null'
		}),
		userId: uuid('user_id').references(() => usersProfile.id, { onDelete: 'cascade' }),
		guestTokenHash: varchar('guest_token_hash', { length: 64 }),
		distinctId: varchar('distinct_id', { length: 64 }).notNull(),
		isOfficial: boolean('is_official').notNull().default(true),
		status: sessionStatusEnum('status').notNull().default('in_progress'),
		score: integer('score').notNull().default(0),
		accuracy: doublePrecision('accuracy').notNull().default(0),
		totalTimeSeconds: integer('total_time_seconds').notNull().default(0),
		createdAt: now(),
		completedAt: timestamp('completed_at', { withTimezone: true })
	},
	(table) => [
		index('daily_attempts_challenge_id_idx').on(table.dailyChallengeId),
		index('daily_attempts_user_id_idx').on(table.userId),
		index('daily_attempts_guest_token_hash_idx').on(table.guestTokenHash),
		index('daily_attempts_distinct_id_idx').on(table.distinctId),
		index('daily_attempts_session_id_idx').on(table.sessionId),
		uniqueIndex('daily_attempts_user_official_uidx')
			.on(table.dailyChallengeId, table.userId)
			.where(sql`user_id IS NOT NULL AND is_official = true`),
		uniqueIndex('daily_attempts_guest_official_uidx')
			.on(table.dailyChallengeId, table.guestTokenHash)
			.where(sql`guest_token_hash IS NOT NULL AND is_official = true`),
		index('daily_attempts_leaderboard_rank_idx')
			.on(
				table.dailyChallengeId,
				table.score.desc(),
				table.accuracy.desc(),
				table.totalTimeSeconds.asc(),
				table.completedAt.asc(),
				table.id.asc()
			)
			.where(sql`user_id IS NOT NULL AND is_official = true AND status = 'completed'`)
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
		userId: uuid('user_id').references(() => usersProfile.id, { onDelete: 'cascade' }),
		selectedAnswer: text('selected_answer').notNull(),
		isCorrect: boolean('is_correct').notNull(),
		timeSpentSeconds: integer('time_spent_seconds').notNull(),
		scoreEarned: integer('score_earned').notNull().default(0),
		createdAt: now()
	},
	(table) => [
		index('session_answers_session_question_id_idx').on(table.sessionQuestionId),
		index('session_answers_user_id_idx').on(table.userId),
		uniqueIndex('session_answers_question_uidx').on(table.sessionQuestionId)
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

export const rateLimits = pgTable(
	'rate_limits',
	{
		key: varchar('key', { length: 255 }).primaryKey(),
		count: integer('count').notNull().default(1),
		resetAt: timestamp('reset_at', { withTimezone: true }).notNull(),
		updatedAt: updatedAt()
	},
	(table) => [index('rate_limits_reset_at_idx').on(table.resetAt)]
);

export const analyticsEvents = pgTable(
	'analytics_events',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		distinctId: varchar('distinct_id', { length: 64 }).notNull(),
		userId: uuid('user_id').references(() => usersProfile.id, { onDelete: 'set null' }),
		event: varchar('event', { length: 64 }).notNull(),
		properties: jsonb('properties').$type<Record<string, unknown>>().notNull().default({}),
		createdAt: now()
	},
	(table) => [
		index('analytics_events_distinct_id_idx').on(table.distinctId),
		index('analytics_events_user_id_idx').on(table.userId),
		index('analytics_events_event_created_at_idx').on(table.event, table.createdAt),
		index('analytics_events_created_at_idx').on(table.createdAt)
	]
);

export const identityAliases = pgTable(
	'identity_aliases',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		anonymousId: varchar('anonymous_id', { length: 64 }).notNull(),
		userId: uuid('user_id')
			.notNull()
			.references(() => usersProfile.id, { onDelete: 'cascade' }),
		createdAt: now()
	},
	(table) => [
		uniqueIndex('identity_aliases_anon_user_uidx').on(table.anonymousId, table.userId),
		index('identity_aliases_anon_id_idx').on(table.anonymousId),
		index('identity_aliases_user_id_idx').on(table.userId)
	]
);

export const sharedResults = pgTable(
	'shared_results',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		publicId: varchar('public_id', { length: 32 }).notNull(),
		sessionId: uuid('session_id')
			.notNull()
			.references(() => challengeSessions.id, { onDelete: 'cascade' }),
		userId: uuid('user_id').references(() => usersProfile.id, { onDelete: 'set null' }),
		displayName: varchar('display_name', { length: 64 }).notNull().default('Guest Solver'),
		isRevoked: boolean('is_revoked').notNull().default(false),
		revokedAt: timestamp('revoked_at', { withTimezone: true }),
		createdAt: now(),
		updatedAt: updatedAt()
	},
	(table) => [
		uniqueIndex('shared_results_public_id_uidx').on(table.publicId),
		uniqueIndex('shared_results_session_active_uidx')
			.on(table.sessionId)
			.where(sql`is_revoked = false`),
		index('shared_results_session_id_idx').on(table.sessionId),
		index('shared_results_user_id_idx').on(table.userId)
	]
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
export type RateLimit = typeof rateLimits.$inferSelect;
export type NewRateLimit = typeof rateLimits.$inferInsert;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;
export type IdentityAlias = typeof identityAliases.$inferSelect;
export type NewIdentityAlias = typeof identityAliases.$inferInsert;
export type DailyChallenge = typeof dailyChallenges.$inferSelect;
export type NewDailyChallenge = typeof dailyChallenges.$inferInsert;
export type DailyChallengeAttempt = typeof dailyChallengeAttempts.$inferSelect;
export type NewDailyChallengeAttempt = typeof dailyChallengeAttempts.$inferInsert;
export type SharedResult = typeof sharedResults.$inferSelect;
export type NewSharedResult = typeof sharedResults.$inferInsert;
