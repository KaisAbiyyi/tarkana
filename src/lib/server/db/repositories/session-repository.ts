import { and, asc, count, desc, eq, inArray, max, sql, exists } from 'drizzle-orm';
import { getDb, type Database } from '$lib/server/db';
import {
	categories,
	challengeConfigs,
	challengeSessions,
	questionRules,
	sessionAnswers,
	sessionQuestions,
	usersProfile,
	type Category,
	type ChallengeConfig,
	type ChallengeSession,
	type NewChallengeSession,
	type NewSessionAnswer,
	type NewSessionQuestion,
	type QuestionRule,
	type SessionAnswer,
	type SessionQuestion
} from '$lib/server/db/schema';
import type { ChallengeType, QuestionType } from '$lib/shared/constants/challenge';

export type SessionRepository = {
	createSession(session: NewChallengeSession): Promise<ChallengeSession>;
	addQuestions(questions: NewSessionQuestion[]): Promise<SessionQuestion[]>;
	addAnswer(answer: NewSessionAnswer): Promise<SessionAnswer>;
	listActiveCategories(): Promise<Category[]>;
	listActiveQuestionRules(): Promise<QuestionRule[]>;
	findActiveConfig(
		challengeType: ChallengeSession['challengeType']
	): Promise<ChallengeConfig | null>;
	findSessionById(sessionId: string): Promise<ChallengeSession | null>;
	findOwnedSession(sessionId: string, userId: string): Promise<ChallengeSession | null>;
	listSessionQuestions(sessionId: string): Promise<SessionQuestion[]>;
	listSessionAnswers(sessionId: string, userId: string): Promise<SessionAnswer[]>;
	findQuestionById(questionId: string): Promise<SessionQuestion | null>;
	findAnswerForQuestion(questionId: string, userId: string): Promise<SessionAnswer | null>;
	listHistory(input: ListHistoryInput): Promise<{
		items: (ChallengeSession & { mode: 'mixed' | QuestionType; validAchievements: string[] })[];
		total: number;
		summary: {
			totalCompleted: number;
			bestScore: number;
			averageAccuracy: number;
			totalRatingDelta: number | null;
			averageTimeSeconds: number;
		};
		filterCounts: Record<string, number>;
	}>;
	getDashboardStats(userId: string): Promise<DashboardSessionStats>;
	markCompleted(input: CompleteSessionInput): Promise<ChallengeSession>;
	completeSessionAndUpdateProfile(input: CompleteSessionAndProfileInput): Promise<ChallengeSession>;
	findActiveSession(userId: string): Promise<ChallengeSession | null>;
	abandonSession(sessionId: string): Promise<void>;
	touchSessionUpdatedAt(sessionId: string): Promise<void>;
};

export type ListHistoryInput = {
	userId: string;
	limit: number;
	offset: number;
	filter?: string | null;
};

export type DashboardSessionStats = {
	totalCompleted: number;
	bestScore: number;
	averageAccuracy: number;
	averageSolveTimeSeconds: number;
	totalRatingDelta: number;
	recentSessions: ChallengeSession[];
};

export type CompleteSessionInput = {
	sessionId: string;
	totalScore: number;
	accuracy: number;
	totalTimeSeconds: number;
	averageTimeSeconds: number;
	ratingAfter: number;
	ratingDelta: number;
	rankAfter: ChallengeSession['rankAfter'];
	isSuspicious: boolean;
	suspiciousReason?: string | null;
};

export type CompleteSessionAndProfileInput = CompleteSessionInput & {
	userId: string;
	profileRating: number;
	profileRank: ChallengeSession['rankAfter'];
};

export function createSessionRepository(database: Database = getDb()): SessionRepository {
	return {
		async createSession(session) {
			const [createdSession] = await database.insert(challengeSessions).values(session).returning();
			if (!createdSession) throw new Error('Could not create session');
			return createdSession;
		},

		async addQuestions(questions) {
			if (questions.length === 0) return [];
			return database.insert(sessionQuestions).values(questions).returning();
		},

		async addAnswer(answer) {
			const [createdAnswer] = await database.insert(sessionAnswers).values(answer).returning();
			if (!createdAnswer) throw new Error('Could not create answer');
			return createdAnswer;
		},

		async listActiveCategories() {
			return database.select().from(categories).where(eq(categories.isActive, true));
		},

		async listActiveQuestionRules() {
			return database.select().from(questionRules).where(eq(questionRules.isActive, true));
		},

		async findActiveConfig(challengeType) {
			const [config] = await database
				.select()
				.from(challengeConfigs)
				.where(
					and(
						eq(challengeConfigs.challengeType, challengeType),
						eq(challengeConfigs.isActive, true)
					)
				)
				.orderBy(desc(challengeConfigs.createdAt))
				.limit(1);

			return config ?? null;
		},

		async findSessionById(sessionId) {
			const [session] = await database
				.select()
				.from(challengeSessions)
				.where(eq(challengeSessions.id, sessionId))
				.limit(1);

			return session ?? null;
		},

		async findOwnedSession(sessionId, userId) {
			const [session] = await database
				.select()
				.from(challengeSessions)
				.where(and(eq(challengeSessions.id, sessionId), eq(challengeSessions.userId, userId)))
				.limit(1);

			return session ?? null;
		},

		async listSessionQuestions(sessionId) {
			return database
				.select()
				.from(sessionQuestions)
				.where(eq(sessionQuestions.sessionId, sessionId))
				.orderBy(asc(sessionQuestions.orderIndex));
		},

		async listSessionAnswers(sessionId, userId) {
			return database
				.select({
					id: sessionAnswers.id,
					sessionQuestionId: sessionAnswers.sessionQuestionId,
					userId: sessionAnswers.userId,
					selectedAnswer: sessionAnswers.selectedAnswer,
					isCorrect: sessionAnswers.isCorrect,
					timeSpentSeconds: sessionAnswers.timeSpentSeconds,
					scoreEarned: sessionAnswers.scoreEarned,
					createdAt: sessionAnswers.createdAt
				})
				.from(sessionAnswers)
				.innerJoin(sessionQuestions, eq(sessionAnswers.sessionQuestionId, sessionQuestions.id))
				.where(and(eq(sessionQuestions.sessionId, sessionId), eq(sessionAnswers.userId, userId)))
				.orderBy(asc(sessionAnswers.createdAt));
		},

		async findQuestionById(questionId) {
			const [question] = await database
				.select()
				.from(sessionQuestions)
				.where(eq(sessionQuestions.id, questionId))
				.limit(1);

			return question ?? null;
		},

		async findAnswerForQuestion(questionId, userId) {
			const [answer] = await database
				.select()
				.from(sessionAnswers)
				.where(
					and(eq(sessionAnswers.sessionQuestionId, questionId), eq(sessionAnswers.userId, userId))
				)
				.limit(1);

			return answer ?? null;
		},

		async listHistory({ userId, limit, offset, filter }) {
			const queryConditions = [
				eq(challengeSessions.userId, userId),
				eq(challengeSessions.status, 'completed')
			];
			if (filter && filter !== 'all') {
				if (
					['number_sequence', 'symbol_pattern', 'mini_deduction', 'memory_pattern'].includes(filter)
				) {
					queryConditions.push(
						eq(challengeSessions.challengeType, 'mode'),
						exists(
							database
								.select()
								.from(sessionQuestions)
								.where(
									and(
										eq(sessionQuestions.sessionId, challengeSessions.id),
										eq(sessionQuestions.questionType, filter as QuestionType)
									)
								)
						)
					);
				} else {
					queryConditions.push(eq(challengeSessions.challengeType, filter as ChallengeType));
				}
			}

			const items = await database
				.select()
				.from(challengeSessions)
				.where(and(...queryConditions))
				.orderBy(desc(challengeSessions.createdAt))
				.limit(limit)
				.offset(offset);

			const [totalRow] = await database
				.select({ value: count() })
				.from(challengeSessions)
				.where(and(...queryConditions));

			const modeItems = items.filter((i) => i.challengeType === 'mode');
			const modeMap = new Map<string, QuestionType>();
			if (modeItems.length > 0) {
				const modes = await database
					.selectDistinct({
						sessionId: sessionQuestions.sessionId,
						questionType: sessionQuestions.questionType
					})
					.from(sessionQuestions)
					.where(
						inArray(
							sessionQuestions.sessionId,
							modeItems.map((i) => i.id)
						)
					);
				for (const m of modes) {
					if (m.sessionId) modeMap.set(m.sessionId, m.questionType);
				}
			}

			const itemsWithMode = items.map((item) => ({
				...item,
				mode: modeMap.get(item.id) ?? 'mixed'
			})) as (ChallengeSession & { mode: 'mixed' | QuestionType })[];

			const [aggregate] = await database
				.select({
					totalCompleted: count(),
					bestScore: max(challengeSessions.totalScore),
					averageAccuracy: sql<number>`coalesce(avg(${challengeSessions.accuracy}), 0)`,
					averageTimeSeconds: sql<number>`coalesce(avg(${challengeSessions.averageTimeSeconds}), 0)`
				})
				.from(challengeSessions)
				.where(
					and(
						...queryConditions,
						eq(challengeSessions.status, 'completed'),
						eq(challengeSessions.isSuspicious, false)
					)
				);

			// Calculate filter counts and achievements
			const allSessions = await database
				.select({
					id: challengeSessions.id,
					challengeType: challengeSessions.challengeType,
					totalQuestions: challengeSessions.totalQuestions,
					totalScore: challengeSessions.totalScore,
					accuracy: challengeSessions.accuracy,
					averageTimeSeconds: challengeSessions.averageTimeSeconds,
					status: challengeSessions.status,
					isSuspicious: challengeSessions.isSuspicious,
					ratingBefore: challengeSessions.ratingBefore,
					ratingAfter: challengeSessions.ratingAfter,
					ratingDelta: challengeSessions.ratingDelta,
					rankBefore: challengeSessions.rankBefore,
					rankAfter: challengeSessions.rankAfter,
					createdAt: challengeSessions.createdAt
				})
				.from(challengeSessions)
				.where(and(eq(challengeSessions.userId, userId), eq(challengeSessions.status, 'completed')))
				.orderBy(desc(challengeSessions.createdAt));

			const modeSessionIds = allSessions.filter((s) => s.challengeType === 'mode').map((s) => s.id);
			let modes: { sessionId: string; questionType: QuestionType }[] = [];

			if (modeSessionIds.length > 0) {
				modes = await database
					.selectDistinct({
						sessionId: sessionQuestions.sessionId,
						questionType: sessionQuestions.questionType
					})
					.from(sessionQuestions)
					.where(inArray(sessionQuestions.sessionId, modeSessionIds));
			}

			const filterCounts: Record<string, number> = {
				all: allSessions.length,
				mixed: 0,
				number_sequence: 0,
				symbol_pattern: 0,
				mini_deduction: 0,
				memory_pattern: 0
			};

			for (const s of allSessions) {
				if (s.challengeType === 'mode') {
					const qt = modes.find((m) => m.sessionId === s.id)?.questionType;
					if (qt && filterCounts[qt] !== undefined) {
						filterCounts[qt]++;
					} else {
						filterCounts.mixed++;
					}
				} else {
					filterCounts.mixed++;
				}
			}

			// Add achievements to itemsWithMode
			const allCompleted = allSessions
				.map((s) => ({ ...s, mode: modeMap.get(s.id) ?? 'mixed' }))
				.filter((s) => s.status === 'completed' && !s.isSuspicious);

			// Calculate total rating delta from valid sessions in current filter
			let filteredTotalRatingDelta: number | null = null;
			const validFilteredSessions = allCompleted.filter((s) => {
				if (filter && filter !== 'all') {
					if (
						['number_sequence', 'symbol_pattern', 'mini_deduction', 'memory_pattern'].includes(
							filter
						)
					) {
						return s.mode === filter;
					}
					return s.challengeType === filter;
				}
				return true;
			});

			const rankedSessions = validFilteredSessions.filter(
				(s) => s.rankBefore !== 'Unranked' || s.rankAfter !== 'Unranked'
			);

			if (rankedSessions.length > 0) {
				// Sort chronological to find actual net change
				const chrono = [...rankedSessions].sort(
					(a, b) => a.createdAt.getTime() - b.createdAt.getTime()
				);
				const first = chrono[0];
				const last = chrono[chrono.length - 1];
				// Final rating minus initial rating
				filteredTotalRatingDelta = last.ratingAfter - first.ratingBefore;
			}

			const itemsWithAchievements = itemsWithMode.map((item) => {
				const badges: { label: string; priority: number }[] = [];
				if (item.status !== 'completed' || item.isSuspicious) {
					return { ...item, validAchievements: [] };
				}

				const comparable = allCompleted.filter(
					(c) => c.mode === item.mode && c.totalQuestions === item.totalQuestions
				);
				const olderComparable = comparable.filter(
					(c) => c.createdAt.getTime() < item.createdAt.getTime()
				);

				const prevSession = olderComparable[0];

				if (
					item.ratingDelta > 0 &&
					item.rankAfter !== item.rankBefore &&
					item.rankBefore !== 'Unranked'
				) {
					badges.push({ label: 'new_rank', priority: 1 });
				}

				if (comparable.length > 1) {
					const bestScore = Math.max(...comparable.map((c) => c.totalScore));
					if (item.totalScore > 0 && item.totalScore === bestScore) {
						let label: string;
						if (item.challengeType === 'standard') label = 'best_score_standard';
						else if (item.challengeType === 'quick') label = 'best_score_quick';
						else if (item.challengeType === 'long') label = 'best_score_long';
						else label = 'best_format';
						badges.push({ label, priority: 2 });
					}
				}

				if (prevSession && item.totalScore > prevSession.totalScore) {
					badges.push({ label: 'improved', priority: 3 });
				}

				if (comparable.length > 1) {
					const bestAccuracy = Math.max(...comparable.map((c) => c.accuracy));
					if (item.accuracy > 0 && item.accuracy === bestAccuracy) {
						const olderWithBest = olderComparable.find((c) => c.accuracy === bestAccuracy);
						if (olderWithBest) {
							badges.push({ label: 'tied_best_accuracy', priority: 6 });
						} else {
							badges.push({ label: 'best_accuracy', priority: 4 });
						}
					}

					const bestTime = Math.min(...comparable.map((c) => c.averageTimeSeconds));
					if (item.averageTimeSeconds > 0 && item.averageTimeSeconds === bestTime) {
						badges.push({ label: 'fastest_time', priority: 5 });
					}
				}

				badges.sort((a, b) => a.priority - b.priority);
				return { ...item, validAchievements: badges.slice(0, 2).map((b) => b.label) };
			});

			return {
				items: itemsWithAchievements,
				total: totalRow?.value ?? 0,
				summary: {
					totalCompleted: aggregate?.totalCompleted ?? 0,
					bestScore: aggregate?.bestScore ?? 0,
					averageAccuracy: aggregate?.averageAccuracy ?? 0,
					totalRatingDelta: filteredTotalRatingDelta,
					averageTimeSeconds: aggregate?.averageTimeSeconds ?? 0
				},
				filterCounts
			};
		},

		async getDashboardStats(userId) {
			const [aggregate] = await database
				.select({
					totalCompleted: count(),
					bestScore: max(challengeSessions.totalScore),
					averageAccuracy: sql<number>`coalesce(avg(${challengeSessions.accuracy}), 0)`,
					averageSolveTimeSeconds: sql<number>`coalesce(avg(${challengeSessions.averageTimeSeconds}), 0)`,
					totalRatingDelta: sql<number>`coalesce(sum(${challengeSessions.ratingDelta}), 0)`
				})
				.from(challengeSessions)
				.where(
					and(
						eq(challengeSessions.userId, userId),
						eq(challengeSessions.status, 'completed'),
						eq(challengeSessions.isSuspicious, false)
					)
				);

			const recentSessions = await database
				.select()
				.from(challengeSessions)
				.where(eq(challengeSessions.userId, userId))
				.orderBy(desc(challengeSessions.createdAt))
				.limit(5);

			return {
				totalCompleted: aggregate?.totalCompleted ?? 0,
				bestScore: aggregate?.bestScore ?? 0,
				averageAccuracy: Number(aggregate?.averageAccuracy ?? 0),
				averageSolveTimeSeconds: Number(aggregate?.averageSolveTimeSeconds ?? 0),
				totalRatingDelta: Number(aggregate?.totalRatingDelta ?? 0),
				recentSessions
			};
		},

		async markCompleted(input) {
			const [updatedSession] = await database
				.update(challengeSessions)
				.set({
					status: 'completed',
					totalScore: input.totalScore,
					accuracy: input.accuracy,
					totalTimeSeconds: input.totalTimeSeconds,
					averageTimeSeconds: input.averageTimeSeconds,
					ratingAfter: input.ratingAfter,
					ratingDelta: input.ratingDelta,
					rankAfter: input.rankAfter,
					isSuspicious: input.isSuspicious,
					suspiciousReason: input.suspiciousReason ?? null,
					completedAt: new Date()
				})
				.where(eq(challengeSessions.id, input.sessionId))
				.returning();

			if (!updatedSession) throw new Error('Could not complete session');
			return updatedSession;
		},

		async completeSessionAndUpdateProfile(input) {
			return database.transaction(async (tx) => {
				const [updatedSession] = await tx
					.update(challengeSessions)
					.set({
						status: 'completed',
						totalScore: input.totalScore,
						accuracy: input.accuracy,
						totalTimeSeconds: input.totalTimeSeconds,
						averageTimeSeconds: input.averageTimeSeconds,
						ratingAfter: input.ratingAfter,
						ratingDelta: input.ratingDelta,
						rankAfter: input.rankAfter,
						isSuspicious: input.isSuspicious,
						suspiciousReason: input.suspiciousReason ?? null,
						completedAt: new Date()
					})
					.where(eq(challengeSessions.id, input.sessionId))
					.returning();

				if (!updatedSession) throw new Error('Could not complete session');

				await tx
					.update(usersProfile)
					.set({ rating: input.profileRating, rank: input.profileRank })
					.where(eq(usersProfile.id, input.userId));

				return updatedSession;
			});
		},

		async findActiveSession(userId) {
			const [session] = await database
				.select()
				.from(challengeSessions)
				.where(
					and(eq(challengeSessions.userId, userId), eq(challengeSessions.status, 'in_progress'))
				)
				.orderBy(desc(challengeSessions.createdAt))
				.limit(1);

			return session ?? null;
		},

		async abandonSession(sessionId) {
			await database
				.update(challengeSessions)
				.set({ status: 'abandoned', completedAt: new Date() })
				.where(eq(challengeSessions.id, sessionId));
		},

		async touchSessionUpdatedAt(sessionId) {
			await database
				.update(challengeSessions)
				.set({ updatedAt: new Date() })
				.where(eq(challengeSessions.id, sessionId));
		}
	};
}
