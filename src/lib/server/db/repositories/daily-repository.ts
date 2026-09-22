import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import { getDb, type Database } from '$lib/server/db';
import {
	challengeSessions,
	dailyChallenges,
	dailyChallengeAttempts,
	sessionQuestions,
	sessionAnswers,
	type ChallengeSession,
	type DailyChallenge,
	type DailyChallengeAttempt,
	type DailyPuzzleSnapshotQuestion,
	type NewChallengeSession,
	type NewDailyChallenge,
	type NewDailyChallengeAttempt,
	type SessionQuestion
} from '$lib/server/db/schema';
import { hashGuestToken } from '$lib/server/sessions/guest-token';
import type { RankName } from '$lib/shared/constants/rank';

export interface CompleteDailyAttemptInput {
	attemptId: string;
	score: number;
	accuracy: number;
	totalTimeSeconds: number;
	completedAt?: Date;
}

export interface ClaimGuestDailyAttemptsInput {
	guestTokenHash: string;
	userId: string;
}

export interface StartDailySessionAtomicInput {
	dailyChallengeId: string;
	totalQuestions: number;
	questions: DailyPuzzleSnapshotQuestion[];
	userId: string | null;
	rawGuestToken: string | null;
	guestTokenHash: string | null;
	distinctId: string;
	userRating: number;
	userRank: RankName;
}

export type StartDailySessionAtomicResult =
	| {
			type: 'created';
			session: ChallengeSession;
			currentQuestion: SessionQuestion;
	  }
	| {
			type: 'resumed';
			session: ChallengeSession;
			currentQuestion: SessionQuestion;
	  }
	| {
			type: 'conflict_completed';
	  }
	| {
			type: 'conflict_forfeited';
	  };

export interface DailyLeaderboardRow {
	position: number;
	userId: string;
	displayName: string;
	logicRank: string;
	score: number;
	accuracy: number;
	totalTimeSeconds: number;
	completedAt: Date;
}

export interface GetDailyLeaderboardInput {
	dailyChallengeId: string;
	limit: number;
	offset: number;
}

export interface GetDailyLeaderboardOutput {
	items: DailyLeaderboardRow[];
	totalParticipants: number;
}

export interface GetUserDailyPositionInput {
	dailyChallengeId: string;
	userId: string;
}

export interface GetAroundMeDailyLeaderboardInput {
	dailyChallengeId: string;
	userId: string;
	windowSize?: number;
}

export interface GetGuestHypotheticalPositionInput {
	dailyChallengeId: string;
	guestTokenHash: string;
}

export interface GuestHypotheticalPositionOutput {
	hypotheticalPosition: number;
	score: number;
	accuracy: number;
	totalTimeSeconds: number;
}

export interface DailyRepository {
	findDailyChallengeByDate(dateString: string): Promise<DailyChallenge | null>;
	getOrCreateDailyChallenge(challenge: NewDailyChallenge): Promise<DailyChallenge>;
	findAttemptForUser(
		dailyChallengeId: string,
		userId: string
	): Promise<DailyChallengeAttempt | null>;
	findAttemptForGuest(
		dailyChallengeId: string,
		guestTokenHash: string
	): Promise<DailyChallengeAttempt | null>;
	createAttempt(attempt: NewDailyChallengeAttempt): Promise<DailyChallengeAttempt>;
	findAttemptBySessionId(sessionId: string): Promise<DailyChallengeAttempt | null>;
	completeAttempt(input: CompleteDailyAttemptInput): Promise<DailyChallengeAttempt>;
	abandonAttempt(attemptId: string): Promise<void>;
	claimGuestDailyAttempts(
		input: ClaimGuestDailyAttemptsInput
	): Promise<{ claimedCount: number; demotedCount: number }>;
	startDailySessionAtomic(
		input: StartDailySessionAtomicInput
	): Promise<StartDailySessionAtomicResult>;
	getDailyLeaderboard(input: GetDailyLeaderboardInput): Promise<GetDailyLeaderboardOutput>;
	getUserDailyPosition(input: GetUserDailyPositionInput): Promise<DailyLeaderboardRow | null>;
	getAroundMeDailyLeaderboard(
		input: GetAroundMeDailyLeaderboardInput
	): Promise<DailyLeaderboardRow[]>;
	getGuestHypotheticalPosition(
		input: GetGuestHypotheticalPositionInput
	): Promise<GuestHypotheticalPositionOutput | null>;
}

export function createDailyRepository(database: Database = getDb()): DailyRepository {
	return {
		async findDailyChallengeByDate(dateString) {
			const [daily] = await database
				.select()
				.from(dailyChallenges)
				.where(eq(dailyChallenges.challengeDate, dateString))
				.limit(1);

			return daily ?? null;
		},

		async getOrCreateDailyChallenge(challenge) {
			// 1. Check if snapshot already exists
			const [existing] = await database
				.select()
				.from(dailyChallenges)
				.where(eq(dailyChallenges.challengeDate, challenge.challengeDate))
				.limit(1);

			if (existing) return existing;

			// 2. Race-safe insert using unique index on challenge_date
			await database
				.insert(dailyChallenges)
				.values(challenge)
				.onConflictDoNothing({ target: dailyChallenges.challengeDate });

			// 3. Re-select the canonical row
			const [canonical] = await database
				.select()
				.from(dailyChallenges)
				.where(eq(dailyChallenges.challengeDate, challenge.challengeDate))
				.limit(1);

			if (!canonical) {
				throw new Error(
					`Failed to create or retrieve canonical daily challenge for ${challenge.challengeDate}`
				);
			}

			return canonical;
		},

		async findAttemptForUser(dailyChallengeId, userId) {
			// Find official attempt first, or latest attempt
			const [attempt] = await database
				.select()
				.from(dailyChallengeAttempts)
				.where(
					and(
						eq(dailyChallengeAttempts.dailyChallengeId, dailyChallengeId),
						eq(dailyChallengeAttempts.userId, userId)
					)
				)
				.orderBy(desc(dailyChallengeAttempts.isOfficial), desc(dailyChallengeAttempts.createdAt))
				.limit(1);

			return attempt ?? null;
		},

		async findAttemptForGuest(dailyChallengeId, guestTokenHash) {
			const [attempt] = await database
				.select()
				.from(dailyChallengeAttempts)
				.where(
					and(
						eq(dailyChallengeAttempts.dailyChallengeId, dailyChallengeId),
						eq(dailyChallengeAttempts.guestTokenHash, guestTokenHash)
					)
				)
				.orderBy(desc(dailyChallengeAttempts.isOfficial), desc(dailyChallengeAttempts.createdAt))
				.limit(1);

			return attempt ?? null;
		},

		async createAttempt(attempt) {
			const [created] = await database.insert(dailyChallengeAttempts).values(attempt).returning();
			if (!created) {
				throw new Error('Failed to create daily challenge attempt');
			}
			return created;
		},

		async findAttemptBySessionId(sessionId) {
			const [attempt] = await database
				.select()
				.from(dailyChallengeAttempts)
				.where(eq(dailyChallengeAttempts.sessionId, sessionId))
				.limit(1);

			return attempt ?? null;
		},

		async completeAttempt(input) {
			const [updated] = await database
				.update(dailyChallengeAttempts)
				.set({
					status: 'completed',
					score: input.score,
					accuracy: input.accuracy,
					totalTimeSeconds: input.totalTimeSeconds,
					completedAt: input.completedAt ?? new Date()
				})
				.where(eq(dailyChallengeAttempts.id, input.attemptId))
				.returning();

			if (!updated) {
				throw new Error(`Daily challenge attempt ${input.attemptId} not found`);
			}

			return updated;
		},

		async abandonAttempt(attemptId) {
			await database
				.update(dailyChallengeAttempts)
				.set({
					status: 'abandoned',
					completedAt: new Date()
				})
				.where(eq(dailyChallengeAttempts.id, attemptId));
		},

		async claimGuestDailyAttempts(input) {
			// Run atomically in transaction
			return database.transaction(async (tx) => {
				const guestAttempts = await tx
					.select()
					.from(dailyChallengeAttempts)
					.where(
						and(
							eq(dailyChallengeAttempts.guestTokenHash, input.guestTokenHash),
							isNull(dailyChallengeAttempts.userId)
						)
					);

				let claimedCount = 0;
				let demotedCount = 0;

				for (const guestAttempt of guestAttempts) {
					// Check if target user already has an attempt for this daily challenge
					const [existingUserAttempt] = await tx
						.select({ id: dailyChallengeAttempts.id })
						.from(dailyChallengeAttempts)
						.where(
							and(
								eq(dailyChallengeAttempts.dailyChallengeId, guestAttempt.dailyChallengeId),
								eq(dailyChallengeAttempts.userId, input.userId)
							)
						)
						.limit(1);

					if (existingUserAttempt) {
						// Existing account attempt wins: demote claimed guest attempt to non-official
						await tx
							.update(dailyChallengeAttempts)
							.set({
								userId: input.userId,
								isOfficial: false
							})
							.where(eq(dailyChallengeAttempts.id, guestAttempt.id));
						demotedCount += 1;
					} else {
						// User has no attempt for this date: transfer as official attempt
						await tx
							.update(dailyChallengeAttempts)
							.set({
								userId: input.userId,
								isOfficial: true
							})
							.where(eq(dailyChallengeAttempts.id, guestAttempt.id));
						claimedCount += 1;
					}
				}

				return { claimedCount, demotedCount };
			});
		},

		async startDailySessionAtomic(input) {
			type DbExecutor = Database | Parameters<Parameters<Database['transaction']>[0]>[0];
			const checkAttempt = async (executor: DbExecutor) => {
				let existingAttempt: DailyChallengeAttempt | undefined;
				if (input.userId) {
					const [att] = await executor
						.select()
						.from(dailyChallengeAttempts)
						.where(
							and(
								eq(dailyChallengeAttempts.dailyChallengeId, input.dailyChallengeId),
								eq(dailyChallengeAttempts.userId, input.userId)
							)
						)
						.orderBy(
							desc(dailyChallengeAttempts.isOfficial),
							desc(dailyChallengeAttempts.createdAt)
						)
						.limit(1);
					existingAttempt = att;
				} else if (input.guestTokenHash) {
					const [att] = await executor
						.select()
						.from(dailyChallengeAttempts)
						.where(
							and(
								eq(dailyChallengeAttempts.dailyChallengeId, input.dailyChallengeId),
								eq(dailyChallengeAttempts.guestTokenHash, input.guestTokenHash)
							)
						)
						.orderBy(
							desc(dailyChallengeAttempts.isOfficial),
							desc(dailyChallengeAttempts.createdAt)
						)
						.limit(1);
					existingAttempt = att;
				}

				if (existingAttempt) {
					if (existingAttempt.status === 'completed') {
						return { type: 'conflict_completed' as const };
					}
					if (existingAttempt.status === 'abandoned') {
						return { type: 'conflict_forfeited' as const };
					}
					if (existingAttempt.status === 'in_progress' && existingAttempt.sessionId) {
						const [session] = await executor
							.select()
							.from(challengeSessions)
							.where(eq(challengeSessions.id, existingAttempt.sessionId))
							.limit(1);

						if (session && session.status === 'in_progress') {
							const questions = await executor
								.select()
								.from(sessionQuestions)
								.where(eq(sessionQuestions.sessionId, session.id))
								.orderBy(asc(sessionQuestions.orderIndex));

							const answers = await executor
								.select({ sessionQuestionId: sessionAnswers.sessionQuestionId })
								.from(sessionAnswers)
								.innerJoin(
									sessionQuestions,
									eq(sessionAnswers.sessionQuestionId, sessionQuestions.id)
								)
								.where(eq(sessionQuestions.sessionId, session.id));

							const answeredIds = new Set(answers.map((a) => a.sessionQuestionId));
							const nextQuestion = questions.find((q) => !answeredIds.has(q.id)) ?? questions[0];

							if (nextQuestion) {
								return {
									type: 'resumed' as const,
									session,
									currentQuestion: nextQuestion
								};
							}
						}
					}
				}
				return null;
			};

			try {
				return await database.transaction(async (tx) => {
					// 1. Check existing attempt within transaction
					const existingResult = await checkAttempt(tx);
					if (existingResult) {
						return existingResult;
					}

					// 2. Atomically create session with guestToken hashed once
					const newSession: NewChallengeSession = {
						userId: input.userId,
						guestToken: input.rawGuestToken ? hashGuestToken(input.rawGuestToken) : null,
						dailyChallengeId: input.dailyChallengeId,
						challengeType: 'daily',
						status: 'in_progress',
						totalQuestions: input.totalQuestions,
						ratingBefore: input.userRating,
						ratingAfter: input.userRating,
						rankBefore: input.userRank,
						rankAfter: input.userRank
					};

					const [session] = await tx.insert(challengeSessions).values(newSession).returning();

					if (!session) {
						throw new Error('Failed to create daily challenge session');
					}

					// 3. Atomically populate questions
					const questionsToInsert = input.questions.map((q) => ({
						sessionId: session.id,
						categoryId: q.categoryId,
						questionType: q.questionType,
						prompt: q.prompt,
						choices: q.choices,
						correctAnswer: q.correctAnswer,
						explanation: q.explanation,
						difficultyScore: q.difficultyScore,
						timeLimitSeconds: q.timeLimitSeconds,
						metadata: q.metadata,
						generatedSeed: q.generatedSeed,
						orderIndex: q.orderIndex
					}));

					const persistedQuestions = await tx
						.insert(sessionQuestions)
						.values(questionsToInsert)
						.returning();

					if (!persistedQuestions || persistedQuestions.length === 0) {
						throw new Error('Failed to insert daily session questions');
					}

					// 4. Atomically record attempt
					await tx.insert(dailyChallengeAttempts).values({
						dailyChallengeId: input.dailyChallengeId,
						sessionId: session.id,
						userId: input.userId,
						guestTokenHash: input.userId ? null : input.guestTokenHash,
						distinctId: input.distinctId,
						isOfficial: true,
						status: 'in_progress'
					});

					return {
						type: 'created' as const,
						session,
						currentQuestion: persistedQuestions[0]
					};
				});
			} catch (err: unknown) {
				if (isUniqueConstraintError(err)) {
					// A concurrent transaction committed first. Reselect the canonical attempt.
					for (let attempt = 0; attempt < 5; attempt++) {
						const fallbackResult = await checkAttempt(database);
						if (fallbackResult) {
							return fallbackResult;
						}
						await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
					}
				}

				throw err;
			}
		},

		async getDailyLeaderboard({ dailyChallengeId, limit, offset }) {
			const query = sql`
				WITH ranked_official_attempts AS (
					SELECT
						dca.id AS attempt_id,
						dca.user_id AS user_id,
						u.display_name AS display_name,
						u.rank AS logic_rank,
						dca.score AS score,
						dca.accuracy AS accuracy,
						dca.total_time_seconds AS total_time_seconds,
						dca.completed_at AS completed_at,
						ROW_NUMBER() OVER (
							ORDER BY
								dca.score DESC,
								dca.accuracy DESC,
								dca.total_time_seconds ASC,
								dca.completed_at ASC,
								dca.id ASC
						) AS position,
						COUNT(*) OVER () AS total_count
					FROM daily_challenge_attempts dca
					JOIN users_profile u ON u.id = dca.user_id
					JOIN challenge_sessions cs ON cs.id = dca.session_id
					WHERE dca.daily_challenge_id = ${dailyChallengeId}
					  AND dca.user_id IS NOT NULL
					  AND dca.is_official = true
					  AND dca.status = 'completed'
					  AND cs.is_suspicious = false
				)
				SELECT *
				FROM ranked_official_attempts
				ORDER BY position ASC
				LIMIT ${limit}
				OFFSET ${offset};
			`;

			const result = await database.execute(query);
			const rows = ('rows' in result ? result.rows : result) as Record<string, unknown>[];

			if (!rows || rows.length === 0) {
				const countResult = await database.execute(sql`
					SELECT COUNT(*) AS total
					FROM daily_challenge_attempts dca
					JOIN challenge_sessions cs ON cs.id = dca.session_id
					WHERE dca.daily_challenge_id = ${dailyChallengeId}
					  AND dca.user_id IS NOT NULL
					  AND dca.is_official = true
					  AND dca.status = 'completed'
					  AND cs.is_suspicious = false;
				`);
				const countRows = ('rows' in countResult ? countResult.rows : countResult) as Record<
					string,
					unknown
				>[];
				const total = Number(countRows[0]?.total ?? 0);
				return { items: [], totalParticipants: total };
			}

			const totalParticipants = Number(rows[0].total_count ?? rows.length);

			const items: DailyLeaderboardRow[] = rows.map((r) => ({
				position: Number(r.position),
				userId: String(r.user_id),
				displayName: String(r.display_name ?? 'Anonymous Solver'),
				logicRank: String(r.logic_rank ?? 'Unranked'),
				score: Number(r.score),
				accuracy: Number(r.accuracy),
				totalTimeSeconds: Number(r.total_time_seconds),
				completedAt: new Date(String(r.completed_at))
			}));

			return { items, totalParticipants };
		},

		async getUserDailyPosition({ dailyChallengeId, userId }) {
			const query = sql`
				WITH ranked_official_attempts AS (
					SELECT
						dca.id AS attempt_id,
						dca.user_id AS user_id,
						u.display_name AS display_name,
						u.rank AS logic_rank,
						dca.score AS score,
						dca.accuracy AS accuracy,
						dca.total_time_seconds AS total_time_seconds,
						dca.completed_at AS completed_at,
						ROW_NUMBER() OVER (
							ORDER BY
								dca.score DESC,
								dca.accuracy DESC,
								dca.total_time_seconds ASC,
								dca.completed_at ASC,
								dca.id ASC
						) AS position
					FROM daily_challenge_attempts dca
					JOIN users_profile u ON u.id = dca.user_id
					JOIN challenge_sessions cs ON cs.id = dca.session_id
					WHERE dca.daily_challenge_id = ${dailyChallengeId}
					  AND dca.user_id IS NOT NULL
					  AND dca.is_official = true
					  AND dca.status = 'completed'
					  AND cs.is_suspicious = false
				)
				SELECT *
				FROM ranked_official_attempts
				WHERE user_id = ${userId}
				LIMIT 1;
			`;

			const result = await database.execute(query);
			const rows = ('rows' in result ? result.rows : result) as Record<string, unknown>[];
			if (!rows || rows.length === 0) return null;

			const r = rows[0];
			return {
				position: Number(r.position),
				userId: String(r.user_id),
				displayName: String(r.display_name ?? 'Anonymous Solver'),
				logicRank: String(r.logic_rank ?? 'Unranked'),
				score: Number(r.score),
				accuracy: Number(r.accuracy),
				totalTimeSeconds: Number(r.total_time_seconds),
				completedAt: new Date(String(r.completed_at))
			};
		},

		async getAroundMeDailyLeaderboard({ dailyChallengeId, userId, windowSize = 2 }) {
			const userPos = await this.getUserDailyPosition({ dailyChallengeId, userId });
			if (!userPos) return [];

			const minPos = Math.max(1, userPos.position - windowSize);
			const maxPos = userPos.position + windowSize;

			const query = sql`
				WITH ranked_official_attempts AS (
					SELECT
						dca.id AS attempt_id,
						dca.user_id AS user_id,
						u.display_name AS display_name,
						u.rank AS logic_rank,
						dca.score AS score,
						dca.accuracy AS accuracy,
						dca.total_time_seconds AS total_time_seconds,
						dca.completed_at AS completed_at,
						ROW_NUMBER() OVER (
							ORDER BY
								dca.score DESC,
								dca.accuracy DESC,
								dca.total_time_seconds ASC,
								dca.completed_at ASC,
								dca.id ASC
						) AS position
					FROM daily_challenge_attempts dca
					JOIN users_profile u ON u.id = dca.user_id
					JOIN challenge_sessions cs ON cs.id = dca.session_id
					WHERE dca.daily_challenge_id = ${dailyChallengeId}
					  AND dca.user_id IS NOT NULL
					  AND dca.is_official = true
					  AND dca.status = 'completed'
					  AND cs.is_suspicious = false
				)
				SELECT *
				FROM ranked_official_attempts
				WHERE position BETWEEN ${minPos} AND ${maxPos}
				ORDER BY position ASC;
			`;

			const result = await database.execute(query);
			const rows = ('rows' in result ? result.rows : result) as Record<string, unknown>[];
			if (!rows) return [];

			return rows.map((r) => ({
				position: Number(r.position),
				userId: String(r.user_id),
				displayName: String(r.display_name ?? 'Anonymous Solver'),
				logicRank: String(r.logic_rank ?? 'Unranked'),
				score: Number(r.score),
				accuracy: Number(r.accuracy),
				totalTimeSeconds: Number(r.total_time_seconds),
				completedAt: new Date(String(r.completed_at))
			}));
		},

		async getGuestHypotheticalPosition({ dailyChallengeId, guestTokenHash }) {
			const [guestAttempt] = await database
				.select({
					id: dailyChallengeAttempts.id,
					score: dailyChallengeAttempts.score,
					accuracy: dailyChallengeAttempts.accuracy,
					totalTimeSeconds: dailyChallengeAttempts.totalTimeSeconds,
					completedAt: dailyChallengeAttempts.completedAt
				})
				.from(dailyChallengeAttempts)
				.where(
					and(
						eq(dailyChallengeAttempts.dailyChallengeId, dailyChallengeId),
						eq(dailyChallengeAttempts.guestTokenHash, guestTokenHash),
						eq(dailyChallengeAttempts.status, 'completed'),
						isNull(dailyChallengeAttempts.userId)
					)
				)
				.orderBy(desc(dailyChallengeAttempts.createdAt))
				.limit(1);

			if (!guestAttempt || !guestAttempt.completedAt) return null;

			const query = sql`
				WITH ranked_official_attempts AS (
					SELECT
						dca.id AS attempt_id,
						dca.score AS score,
						dca.accuracy AS accuracy,
						dca.total_time_seconds AS total_time_seconds,
						dca.completed_at AS completed_at
					FROM daily_challenge_attempts dca
					JOIN challenge_sessions cs ON cs.id = dca.session_id
					WHERE dca.daily_challenge_id = ${dailyChallengeId}
					  AND dca.user_id IS NOT NULL
					  AND dca.is_official = true
					  AND dca.status = 'completed'
					  AND cs.is_suspicious = false
				)
				SELECT COUNT(*) AS ahead_count
				FROM ranked_official_attempts roa
				WHERE roa.score > ${guestAttempt.score}
				   OR (roa.score = ${guestAttempt.score} AND roa.accuracy > ${guestAttempt.accuracy})
				   OR (roa.score = ${guestAttempt.score} AND roa.accuracy = ${guestAttempt.accuracy} AND roa.total_time_seconds < ${guestAttempt.totalTimeSeconds})
				   OR (roa.score = ${guestAttempt.score} AND roa.accuracy = ${guestAttempt.accuracy} AND roa.total_time_seconds = ${guestAttempt.totalTimeSeconds} AND roa.completed_at < ${guestAttempt.completedAt})
				   OR (roa.score = ${guestAttempt.score} AND roa.accuracy = ${guestAttempt.accuracy} AND roa.total_time_seconds = ${guestAttempt.totalTimeSeconds} AND roa.completed_at = ${guestAttempt.completedAt} AND roa.attempt_id < ${guestAttempt.id});
			`;

			const result = await database.execute(query);
			const rows = ('rows' in result ? result.rows : result) as Record<string, unknown>[];
			const aheadCount = Number(rows[0]?.ahead_count ?? 0);

			return {
				hypotheticalPosition: aheadCount + 1,
				score: guestAttempt.score,
				accuracy: guestAttempt.accuracy,
				totalTimeSeconds: guestAttempt.totalTimeSeconds
			};
		}
	};
}

function isUniqueConstraintError(err: unknown): boolean {
	let current: unknown = err;
	while (current && typeof current === 'object') {
		const candidate = current as Record<string, unknown>;
		if (candidate.code === '23505') return true;
		if (
			typeof candidate.message === 'string' &&
			/unique constraint|duplicate key|daily_attempts_/i.test(candidate.message)
		) {
			return true;
		}
		if (typeof candidate.detail === 'string' && /already exists/i.test(candidate.detail)) {
			return true;
		}
		if (typeof candidate.constraint === 'string' && /daily_attempts_/i.test(candidate.constraint)) {
			return true;
		}
		current = candidate.cause;
	}
	return false;
}
