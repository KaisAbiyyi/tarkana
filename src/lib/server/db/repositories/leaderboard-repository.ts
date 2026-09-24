import { sql } from 'drizzle-orm';
import { getDb, type Database } from '$lib/server/db';
import type { QuestionType } from '$lib/shared/constants/challenge';
import type { RankedTier } from '$lib/shared/constants/rank';
import {
	MASTERY_PROVISIONAL_MIN_QUESTIONS,
	MASTERY_PROVISIONAL_MIN_SESSIONS
} from '$lib/server/scoring/mastery';

export type LeaderboardRow = {
	userId: string;
	displayName: string;
	rank: string;
	rating: number;
	averageAccuracy: number;
	totalCompleted: number;
	position: number;
};

export type CategoryLeaderboardRow = {
	userId: string;
	displayName: string;
	questionType: QuestionType;
	rating: number;
	accuracy: number;
	totalQuestions: number;
	totalSessions: number;
	position: number;
};

export type UserCategoryMasteryProgress = {
	rating: number;
	totalQuestions: number;
	totalSessions: number;
	correctAnswers: number;
};

export type WeeklyLeaderboardRow = {
	userId: string;
	displayName: string;
	rank: string;
	rating: number;
	averageScorePerAnswer: number;
	averageAccuracy: number;
	responseTimeRatio: number;
	totalQuestions: number;
	totalSessions: number;
	weeklyScore: number;
	weeklyRatingDelta: number;
	position: number;
};

export type UserWeeklyProgress = {
	userId: string;
	displayName: string;
	rank: string;
	rating: number;
	averageScorePerAnswer: number;
	averageAccuracy: number;
	responseTimeRatio: number;
	totalQuestions: number;
	totalSessions: number;
	weeklyScore: number;
	weeklyRatingDelta: number;
	isQualified: boolean;
	questionsNeeded: number;
};

export const WEEKLY_LEADERBOARD_MIN_QUESTIONS = 20;

export type LeaderboardRepository = {
	listGlobal(input: { limit: number; offset: number }): Promise<LeaderboardRow[]>;
	getUserGlobalPosition(userId: string): Promise<LeaderboardRow | null>;

	listTier(input: { rank: RankedTier; limit: number; offset: number }): Promise<LeaderboardRow[]>;
	getUserTierPosition(input: { userId: string; rank: RankedTier }): Promise<LeaderboardRow | null>;

	listCategory(input: {
		questionType: QuestionType;
		limit: number;
		offset: number;
	}): Promise<CategoryLeaderboardRow[]>;
	getUserCategoryPosition(input: {
		userId: string;
		questionType: QuestionType;
	}): Promise<CategoryLeaderboardRow | null>;
	getUserCategoryMastery(input: {
		userId: string;
		questionType: QuestionType;
	}): Promise<UserCategoryMasteryProgress | null>;

	listWeekly(input: {
		startOfWeek: Date;
		endOfWeek: Date;
		limit: number;
		offset: number;
	}): Promise<WeeklyLeaderboardRow[]>;
	getUserWeeklyPosition(input: {
		userId: string;
		startOfWeek: Date;
		endOfWeek: Date;
	}): Promise<WeeklyLeaderboardRow | null>;
	getUserWeeklyProgress(input: {
		userId: string;
		startOfWeek: Date;
		endOfWeek: Date;
	}): Promise<UserWeeklyProgress | null>;
	countWeeklyParticipants(input: { startOfWeek: Date; endOfWeek: Date }): Promise<number>;

	// Aliases for backwards compatibility
	list(input: { limit: number; offset: number }): Promise<LeaderboardRow[]>;
	getUserPosition(userId: string): Promise<LeaderboardRow | null>;
};

function parseRows<T>(result: unknown, mapper: (row: Record<string, unknown>) => T): T[] {
	const rows =
		result && typeof result === 'object' && 'rows' in result
			? (result.rows as Record<string, unknown>[])
			: (result as Record<string, unknown>[]);
	if (!Array.isArray(rows)) return [];
	return rows.map(mapper);
}

function parseLeaderboardRow(row: Record<string, unknown>): LeaderboardRow {
	return {
		userId: String(row.userId),
		displayName: String(row.displayName),
		rank: String(row.rank),
		rating: Number(row.rating),
		averageAccuracy: Number(row.averageAccuracy),
		totalCompleted: Number(row.totalCompleted),
		position: Number(row.position)
	};
}

function parseCategoryLeaderboardRow(row: Record<string, unknown>): CategoryLeaderboardRow {
	return {
		userId: String(row.userId),
		displayName: String(row.displayName),
		questionType: row.questionType as QuestionType,
		rating: Number(row.rating),
		accuracy: Number(row.accuracy),
		totalQuestions: Number(row.totalQuestions),
		totalSessions: Number(row.totalSessions),
		position: Number(row.position)
	};
}

function parseWeeklyLeaderboardRow(row: Record<string, unknown>): WeeklyLeaderboardRow {
	return {
		userId: String(row.userId),
		displayName: String(row.displayName),
		rank: String(row.rank),
		rating: Number(row.rating),
		averageScorePerAnswer: Number(row.averageScorePerAnswer ?? 0),
		averageAccuracy: Number(row.averageAccuracy ?? 0),
		responseTimeRatio: Number(row.responseTimeRatio ?? 0),
		totalQuestions: Number(row.totalQuestions ?? 0),
		totalSessions: Number(row.totalSessions ?? 0),
		weeklyScore: Number(row.weeklyScore ?? 0),
		weeklyRatingDelta: Number(row.weeklyRatingDelta ?? 0),
		position: Number(row.position)
	};
}

export function createLeaderboardRepository(database: Database = getDb()): LeaderboardRepository {
	return {
		async listGlobal({ limit, offset }) {
			const result = await database.execute(sql`
				WITH ranked_users AS (
					SELECT
						u.id as "userId",
						u.display_name as "displayName",
						u.rank,
						u.rating,
						coalesce(avg(cs.accuracy), 0) as "averageAccuracy",
						count(cs.id) as "totalCompleted",
						row_number() OVER (
							ORDER BY u.rating DESC, count(cs.id) DESC, coalesce(avg(cs.accuracy), 0) DESC, u.id ASC
						) as position
					FROM users_profile u
					LEFT JOIN challenge_sessions cs ON cs.user_id = u.id AND cs.status = 'completed' AND cs.is_suspicious = false AND cs.claimed_at IS NULL AND cs.challenge_type NOT IN ('daily', 'duel')
					GROUP BY u.id, u.display_name, u.rank, u.rating
				)
				SELECT * FROM ranked_users
				ORDER BY position ASC
				LIMIT ${limit} OFFSET ${offset}
			`);
			return parseRows(result, parseLeaderboardRow);
		},

		async getUserGlobalPosition(userId) {
			const result = await database.execute(sql`
				WITH ranked_users AS (
					SELECT
						u.id as "userId",
						u.display_name as "displayName",
						u.rank,
						u.rating,
						coalesce(avg(cs.accuracy), 0) as "averageAccuracy",
						count(cs.id) as "totalCompleted",
						row_number() OVER (
							ORDER BY u.rating DESC, count(cs.id) DESC, coalesce(avg(cs.accuracy), 0) DESC, u.id ASC
						) as position
					FROM users_profile u
					LEFT JOIN challenge_sessions cs ON cs.user_id = u.id AND cs.status = 'completed' AND cs.is_suspicious = false AND cs.claimed_at IS NULL AND cs.challenge_type NOT IN ('daily', 'duel')
					GROUP BY u.id, u.display_name, u.rank, u.rating
				)
				SELECT * FROM ranked_users WHERE "userId" = ${userId}
			`);
			const rows = parseRows(result, parseLeaderboardRow);
			return rows.length > 0 ? rows[0] : null;
		},

		async listTier({ rank, limit, offset }) {
			if (rank === ('Unranked' as unknown)) return [];
			const result = await database.execute(sql`
				WITH ranked_users AS (
					SELECT
						u.id as "userId",
						u.display_name as "displayName",
						u.rank,
						u.rating,
						coalesce(avg(cs.accuracy), 0) as "averageAccuracy",
						count(cs.id) as "totalCompleted",
						row_number() OVER (
							ORDER BY u.rating DESC, count(cs.id) DESC, coalesce(avg(cs.accuracy), 0) DESC, u.id ASC
						) as position
					FROM users_profile u
					LEFT JOIN challenge_sessions cs ON cs.user_id = u.id AND cs.status = 'completed' AND cs.is_suspicious = false AND cs.claimed_at IS NULL AND cs.challenge_type NOT IN ('daily', 'duel')
					WHERE u.rank = ${rank} AND u.rank != 'Unranked'
					GROUP BY u.id, u.display_name, u.rank, u.rating
				)
				SELECT * FROM ranked_users
				ORDER BY position ASC
				LIMIT ${limit} OFFSET ${offset}
			`);
			return parseRows(result, parseLeaderboardRow);
		},

		async getUserTierPosition({ userId, rank }) {
			if (rank === ('Unranked' as unknown)) return null;
			const result = await database.execute(sql`
				WITH ranked_users AS (
					SELECT
						u.id as "userId",
						u.display_name as "displayName",
						u.rank,
						u.rating,
						coalesce(avg(cs.accuracy), 0) as "averageAccuracy",
						count(cs.id) as "totalCompleted",
						row_number() OVER (
							ORDER BY u.rating DESC, count(cs.id) DESC, coalesce(avg(cs.accuracy), 0) DESC, u.id ASC
						) as position
					FROM users_profile u
					LEFT JOIN challenge_sessions cs ON cs.user_id = u.id AND cs.status = 'completed' AND cs.is_suspicious = false AND cs.claimed_at IS NULL AND cs.challenge_type NOT IN ('daily', 'duel')
					WHERE u.rank = ${rank} AND u.rank != 'Unranked'
					GROUP BY u.id, u.display_name, u.rank, u.rating
				)
				SELECT * FROM ranked_users WHERE "userId" = ${userId}
			`);
			const rows = parseRows(result, parseLeaderboardRow);
			return rows.length > 0 ? rows[0] : null;
		},

		async listCategory({ questionType, limit, offset }) {
			const result = await database.execute(sql`
				WITH ranked_category AS (
					SELECT
						u.id as "userId",
						u.display_name as "displayName",
						ucm.question_type as "questionType",
						ucm.rating,
						ucm.total_questions as "totalQuestions",
						ucm.total_sessions as "totalSessions",
						ucm.correct_answers as "correctAnswers",
						CASE
							WHEN ucm.total_questions > 0 THEN (ucm.correct_answers::float / ucm.total_questions) * 100
							ELSE 0
						END as accuracy,
						row_number() OVER (
							ORDER BY
								ucm.rating DESC,
								ucm.total_questions DESC,
								(CASE WHEN ucm.total_questions > 0 THEN (ucm.correct_answers::float / ucm.total_questions) ELSE 0 END) DESC,
								u.id ASC
						) as position
					FROM user_category_mastery ucm
					JOIN users_profile u ON u.id = ucm.user_id
					WHERE ucm.question_type = ${questionType}
						AND ucm.total_questions >= ${MASTERY_PROVISIONAL_MIN_QUESTIONS}
						AND ucm.total_sessions >= ${MASTERY_PROVISIONAL_MIN_SESSIONS}
				)
				SELECT * FROM ranked_category
				ORDER BY position ASC
				LIMIT ${limit} OFFSET ${offset}
			`);
			return parseRows(result, parseCategoryLeaderboardRow);
		},

		async getUserCategoryPosition({ userId, questionType }) {
			const result = await database.execute(sql`
				WITH ranked_category AS (
					SELECT
						u.id as "userId",
						u.display_name as "displayName",
						ucm.question_type as "questionType",
						ucm.rating,
						ucm.total_questions as "totalQuestions",
						ucm.total_sessions as "totalSessions",
						ucm.correct_answers as "correctAnswers",
						CASE
							WHEN ucm.total_questions > 0 THEN (ucm.correct_answers::float / ucm.total_questions) * 100
							ELSE 0
						END as accuracy,
						row_number() OVER (
							ORDER BY
								ucm.rating DESC,
								ucm.total_questions DESC,
								(CASE WHEN ucm.total_questions > 0 THEN (ucm.correct_answers::float / ucm.total_questions) ELSE 0 END) DESC,
								u.id ASC
						) as position
					FROM user_category_mastery ucm
					JOIN users_profile u ON u.id = ucm.user_id
					WHERE ucm.question_type = ${questionType}
						AND ucm.total_questions >= ${MASTERY_PROVISIONAL_MIN_QUESTIONS}
						AND ucm.total_sessions >= ${MASTERY_PROVISIONAL_MIN_SESSIONS}
				)
				SELECT * FROM ranked_category WHERE "userId" = ${userId}
			`);
			const rows = parseRows(result, parseCategoryLeaderboardRow);
			return rows.length > 0 ? rows[0] : null;
		},

		async getUserCategoryMastery({ userId, questionType }) {
			const result = await database.execute(sql`
				SELECT
					rating,
					total_questions as "totalQuestions",
					total_sessions as "totalSessions",
					correct_answers as "correctAnswers"
				FROM user_category_mastery
				WHERE user_id = ${userId} AND question_type = ${questionType}
				LIMIT 1
			`);
			const rows = parseRows(result, (r) => ({
				rating: Number(r.rating),
				totalQuestions: Number(r.totalQuestions),
				totalSessions: Number(r.totalSessions),
				correctAnswers: Number(r.correctAnswers)
			}));
			return rows.length > 0 ? rows[0] : null;
		},

		async listWeekly({ startOfWeek, endOfWeek, limit, offset }) {
			const startIso = startOfWeek.toISOString();
			const endIso = endOfWeek.toISOString();
			const result = await database.execute(sql`
				WITH eligible_sessions AS (
					SELECT
						cs.id,
						cs.user_id,
						cs.total_score,
						cs.rating_delta
					FROM challenge_sessions cs
					WHERE cs.status = 'completed'
						AND cs.is_suspicious = false
						AND cs.claimed_at IS NULL
						AND cs.challenge_type IN ('quick', 'standard', 'long', 'mode')
						AND cs.completed_at >= ${startIso}
						AND cs.completed_at < ${endIso}
				),
				user_answer_stats AS (
					SELECT
						es.user_id,
						count(sa.id)::integer as rated_answers,
						count(distinct es.id)::integer as eligible_sessions,
						avg(sa.score_earned)::float as avg_score_per_answer,
						(avg(case when sa.is_correct then 1.0 else 0.0 end) * 100)::float as answer_accuracy,
						avg(sa.time_spent_seconds::float / nullif(sq.time_limit_seconds::float, 0))::float as response_time_ratio
					FROM eligible_sessions es
					JOIN session_questions sq ON sq.session_id = es.id
					JOIN session_answers sa ON sa.session_question_id = sq.id
					GROUP BY es.user_id
					HAVING count(sa.id) >= ${WEEKLY_LEADERBOARD_MIN_QUESTIONS}
				),
				user_session_stats AS (
					SELECT
						es.user_id,
						coalesce(sum(es.total_score), 0)::integer as weekly_score,
						coalesce(sum(es.rating_delta), 0)::integer as weekly_rating_delta
					FROM eligible_sessions es
					GROUP BY es.user_id
				),
				ranked_weekly AS (
					SELECT
						u.id as "userId",
						u.display_name as "displayName",
						u.rank,
						u.rating,
						coalesce(uas.avg_score_per_answer, 0) as "averageScorePerAnswer",
						coalesce(uas.answer_accuracy, 0) as "averageAccuracy",
						coalesce(uas.response_time_ratio, 0) as "responseTimeRatio",
						coalesce(uas.rated_answers, 0) as "totalQuestions",
						coalesce(uas.eligible_sessions, 0) as "totalSessions",
						coalesce(uss.weekly_score, 0) as "weeklyScore",
						coalesce(uss.weekly_rating_delta, 0) as "weeklyRatingDelta",
						row_number() OVER (
							ORDER BY
								uas.avg_score_per_answer DESC,
								uas.answer_accuracy DESC,
								uas.response_time_ratio ASC,
								uas.rated_answers DESC,
								u.id ASC
						) as position
					FROM user_answer_stats uas
					JOIN users_profile u ON u.id = uas.user_id
					LEFT JOIN user_session_stats uss ON uss.user_id = u.id
				)
				SELECT * FROM ranked_weekly
				ORDER BY position ASC
				LIMIT ${limit} OFFSET ${offset}
			`);
			return parseRows(result, parseWeeklyLeaderboardRow);
		},

		async getUserWeeklyPosition({ userId, startOfWeek, endOfWeek }) {
			const startIso = startOfWeek.toISOString();
			const endIso = endOfWeek.toISOString();
			const result = await database.execute(sql`
				WITH eligible_sessions AS (
					SELECT
						cs.id,
						cs.user_id,
						cs.total_score,
						cs.rating_delta
					FROM challenge_sessions cs
					WHERE cs.status = 'completed'
						AND cs.is_suspicious = false
						AND cs.claimed_at IS NULL
						AND cs.challenge_type IN ('quick', 'standard', 'long', 'mode')
						AND cs.completed_at >= ${startIso}
						AND cs.completed_at < ${endIso}
				),
				user_answer_stats AS (
					SELECT
						es.user_id,
						count(sa.id)::integer as rated_answers,
						count(distinct es.id)::integer as eligible_sessions,
						avg(sa.score_earned)::float as avg_score_per_answer,
						(avg(case when sa.is_correct then 1.0 else 0.0 end) * 100)::float as answer_accuracy,
						avg(sa.time_spent_seconds::float / nullif(sq.time_limit_seconds::float, 0))::float as response_time_ratio
					FROM eligible_sessions es
					JOIN session_questions sq ON sq.session_id = es.id
					JOIN session_answers sa ON sa.session_question_id = sq.id
					GROUP BY es.user_id
					HAVING count(sa.id) >= ${WEEKLY_LEADERBOARD_MIN_QUESTIONS}
				),
				user_session_stats AS (
					SELECT
						es.user_id,
						coalesce(sum(es.total_score), 0)::integer as weekly_score,
						coalesce(sum(es.rating_delta), 0)::integer as weekly_rating_delta
					FROM eligible_sessions es
					GROUP BY es.user_id
				),
				ranked_weekly AS (
					SELECT
						u.id as "userId",
						u.display_name as "displayName",
						u.rank,
						u.rating,
						coalesce(uas.avg_score_per_answer, 0) as "averageScorePerAnswer",
						coalesce(uas.answer_accuracy, 0) as "averageAccuracy",
						coalesce(uas.response_time_ratio, 0) as "responseTimeRatio",
						coalesce(uas.rated_answers, 0) as "totalQuestions",
						coalesce(uas.eligible_sessions, 0) as "totalSessions",
						coalesce(uss.weekly_score, 0) as "weeklyScore",
						coalesce(uss.weekly_rating_delta, 0) as "weeklyRatingDelta",
						row_number() OVER (
							ORDER BY
								uas.avg_score_per_answer DESC,
								uas.answer_accuracy DESC,
								uas.response_time_ratio ASC,
								uas.rated_answers DESC,
								u.id ASC
						) as position
					FROM user_answer_stats uas
					JOIN users_profile u ON u.id = uas.user_id
					LEFT JOIN user_session_stats uss ON uss.user_id = u.id
				)
				SELECT * FROM ranked_weekly WHERE "userId" = ${userId}
			`);
			const rows = parseRows(result, parseWeeklyLeaderboardRow);
			return rows.length > 0 ? rows[0] : null;
		},

		async getUserWeeklyProgress({ userId, startOfWeek, endOfWeek }) {
			const startIso = startOfWeek.toISOString();
			const endIso = endOfWeek.toISOString();
			const result = await database.execute(sql`
				WITH eligible_sessions AS (
					SELECT
						cs.id,
						cs.user_id,
						cs.total_score,
						cs.rating_delta
					FROM challenge_sessions cs
					WHERE cs.user_id = ${userId}
						AND cs.status = 'completed'
						AND cs.is_suspicious = false
						AND cs.claimed_at IS NULL
						AND cs.challenge_type IN ('quick', 'standard', 'long', 'mode')
						AND cs.completed_at >= ${startIso}
						AND cs.completed_at < ${endIso}
				),
				user_answer_stats AS (
					SELECT
						count(sa.id)::integer as rated_answers,
						count(distinct es.id)::integer as eligible_sessions,
						coalesce(avg(sa.score_earned), 0)::float as avg_score_per_answer,
						coalesce(avg(case when sa.is_correct then 1.0 else 0.0 end) * 100, 0)::float as answer_accuracy,
						coalesce(avg(sa.time_spent_seconds::float / nullif(sq.time_limit_seconds::float, 0)), 0)::float as response_time_ratio
					FROM eligible_sessions es
					JOIN session_questions sq ON sq.session_id = es.id
					JOIN session_answers sa ON sa.session_question_id = sq.id
				),
				user_session_stats AS (
					SELECT
						coalesce(sum(es.total_score), 0)::integer as weekly_score,
						coalesce(sum(es.rating_delta), 0)::integer as weekly_rating_delta
					FROM eligible_sessions es
				)
				SELECT
					u.id as "userId",
					u.display_name as "displayName",
					u.rank,
					u.rating,
					coalesce(uas.avg_score_per_answer, 0) as "averageScorePerAnswer",
					coalesce(uas.answer_accuracy, 0) as "averageAccuracy",
					coalesce(uas.response_time_ratio, 0) as "responseTimeRatio",
					coalesce(uas.rated_answers, 0) as "totalQuestions",
					coalesce(uas.eligible_sessions, 0) as "totalSessions",
					coalesce(uss.weekly_score, 0) as "weeklyScore",
					coalesce(uss.weekly_rating_delta, 0) as "weeklyRatingDelta"
				FROM users_profile u
				CROSS JOIN user_answer_stats uas
				CROSS JOIN user_session_stats uss
				WHERE u.id = ${userId}
			`);
			const rows = parseRows(result, (r) => {
				const totalQuestions = Number(r.totalQuestions);
				const isQualified = totalQuestions >= WEEKLY_LEADERBOARD_MIN_QUESTIONS;
				return {
					userId: String(r.userId),
					displayName: String(r.displayName),
					rank: String(r.rank),
					rating: Number(r.rating),
					averageScorePerAnswer: Number(r.averageScorePerAnswer),
					averageAccuracy: Number(r.averageAccuracy),
					responseTimeRatio: Number(r.responseTimeRatio),
					totalQuestions,
					totalSessions: Number(r.totalSessions),
					weeklyScore: Number(r.weeklyScore),
					weeklyRatingDelta: Number(r.weeklyRatingDelta),
					isQualified,
					questionsNeeded: isQualified
						? 0
						: Math.max(0, WEEKLY_LEADERBOARD_MIN_QUESTIONS - totalQuestions)
				};
			});
			return rows.length > 0 ? rows[0] : null;
		},

		async countWeeklyParticipants({ startOfWeek, endOfWeek }) {
			const startIso = startOfWeek.toISOString();
			const endIso = endOfWeek.toISOString();
			const result = await database.execute(sql`
				WITH eligible_sessions AS (
					SELECT
						cs.id,
						cs.user_id
					FROM challenge_sessions cs
					WHERE cs.status = 'completed'
						AND cs.is_suspicious = false
						AND cs.claimed_at IS NULL
						AND cs.challenge_type IN ('quick', 'standard', 'long', 'mode')
						AND cs.completed_at >= ${startIso}
						AND cs.completed_at < ${endIso}
				),
				user_answer_stats AS (
					SELECT
						es.user_id
					FROM eligible_sessions es
					JOIN session_questions sq ON sq.session_id = es.id
					JOIN session_answers sa ON sa.session_question_id = sq.id
					GROUP BY es.user_id
					HAVING count(sa.id) >= ${WEEKLY_LEADERBOARD_MIN_QUESTIONS}
				)
				SELECT count(*)::integer as count FROM user_answer_stats
			`);
			const rows = parseRows(result, (r) => Number(r.count));
			return rows.length > 0 ? rows[0] : 0;
		},

		async list(input) {
			return this.listGlobal(input);
		},

		async getUserPosition(userId) {
			return this.getUserGlobalPosition(userId);
		}
	};
}
