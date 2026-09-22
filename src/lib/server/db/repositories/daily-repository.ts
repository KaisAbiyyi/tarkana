import { and, asc, desc, eq, isNull } from 'drizzle-orm';
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
				const isUniqueViolation =
					(typeof err === 'object' &&
						err !== null &&
						'code' in err &&
						(err as { code: string }).code === '23505') ||
					(err instanceof Error && /unique constraint|daily_attempts_/i.test(err.message));

				if (isUniqueViolation) {
					// A concurrent transaction committed first. Reselect the canonical attempt.
					const fallbackResult = await checkAttempt(database);
					if (fallbackResult) {
						return fallbackResult;
					}
				}

				throw err;
			}
		}
	};
}
