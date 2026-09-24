import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { getDb, type Database } from '$lib/server/db';
import {
	challengeSessions,
	sessionAnswers,
	sessionCategoryMasteryChanges,
	sessionQuestions,
	userCategoryMastery
} from '$lib/server/db/schema';
import {
	calculateCategoryMasteryUpdate,
	isMasteryEligibleChallengeType,
	MASTERY_RATING_VERSION,
	type MasteryQuestionResult
} from '$lib/server/scoring/mastery';
import type { QuestionType } from '$lib/shared/constants/challenge';

export interface CategoryMasteryState {
	rating: number;
	totalQuestions: number;
	correctAnswers: number;
	totalSessions: number;
}

export interface BackfillUserResult {
	userId: string;
	sessionsProcessed: number;
	sessionsSkipped: number;
	categoriesUpdated: Record<string, CategoryMasteryState>;
}

export interface BackfillSummary {
	totalUsers: number;
	totalSessionsProcessed: number;
	totalSessionsSkipped: number;
	userResults: BackfillUserResult[];
	dryRun: boolean;
}

export interface BackfillReplayOptions {
	userId?: string;
	dryRun?: boolean;
	recomputeAll?: boolean;
}

export interface BackfillOptions extends BackfillReplayOptions {
	database?: Database;
}

export interface BackfillDataProvider {
	getEligibleUserIds(): Promise<string[]>;
	getExistingProcessedSessionIds(userId: string): Promise<Set<string>>;
	getExistingMasteryState(userId: string): Promise<Map<QuestionType, CategoryMasteryState>>;
	getEligibleSessions(userId: string): Promise<
		Array<{
			id: string;
			challengeType: string;
			ratingBefore: number;
			completedAt: Date | null;
		}>
	>;
	getSessionQuestionsAndAnswers(
		sessionId: string,
		userId: string
	): Promise<{
		questions: Array<{
			id: string;
			questionType: QuestionType;
			difficultyScore: number;
			orderIndex: number;
		}>;
		answers: Array<{ sessionQuestionId: string; isCorrect: boolean }>;
	}>;
	resetUserMastery(userId: string): Promise<void>;
	persistMasteryUpdate(data: {
		change: {
			sessionId: string;
			userId: string;
			questionType: QuestionType;
			ratingBefore: number;
			ratingAfter: number;
			ratingDelta: number;
			ratedQuestions: number;
			correctAnswers: number;
		};
		mastery: {
			userId: string;
			questionType: QuestionType;
			rating: number;
			totalQuestions: number;
			correctAnswers: number;
			totalSessions: number;
		};
	}): Promise<void>;
}

/**
 * Creates the default Drizzle database provider for category mastery backfill.
 */
export function createDrizzleBackfillProvider(database: Database): BackfillDataProvider {
	return {
		async getEligibleUserIds() {
			const distinctUsers = await database
				.selectDistinct({ userId: challengeSessions.userId })
				.from(challengeSessions)
				.where(
					and(
						eq(challengeSessions.status, 'completed'),
						eq(challengeSessions.isSuspicious, false),
						sql`${challengeSessions.userId} IS NOT NULL`,
						inArray(challengeSessions.challengeType, ['quick', 'standard', 'long', 'mode'])
					)
				);
			return distinctUsers.map((u) => u.userId).filter((id): id is string => Boolean(id));
		},

		async getExistingProcessedSessionIds(userId: string) {
			const existingChanges = await database
				.select({ sessionId: sessionCategoryMasteryChanges.sessionId })
				.from(sessionCategoryMasteryChanges)
				.where(eq(sessionCategoryMasteryChanges.userId, userId));
			const set = new Set<string>();
			for (const c of existingChanges) {
				set.add(c.sessionId);
			}
			return set;
		},

		async getExistingMasteryState(userId: string) {
			const existing = await database
				.select()
				.from(userCategoryMastery)
				.where(eq(userCategoryMastery.userId, userId));
			const map = new Map<QuestionType, CategoryMasteryState>();
			for (const m of existing) {
				map.set(m.questionType, {
					rating: m.rating,
					totalQuestions: m.totalQuestions,
					correctAnswers: m.correctAnswers,
					totalSessions: m.totalSessions
				});
			}
			return map;
		},

		async getEligibleSessions(userId: string) {
			return database
				.select({
					id: challengeSessions.id,
					challengeType: challengeSessions.challengeType,
					ratingBefore: challengeSessions.ratingBefore,
					completedAt: challengeSessions.completedAt
				})
				.from(challengeSessions)
				.where(
					and(
						eq(challengeSessions.userId, userId),
						eq(challengeSessions.status, 'completed'),
						eq(challengeSessions.isSuspicious, false),
						inArray(challengeSessions.challengeType, ['quick', 'standard', 'long', 'mode'])
					)
				)
				.orderBy(
					asc(challengeSessions.completedAt),
					asc(challengeSessions.createdAt),
					asc(challengeSessions.id)
				);
		},

		async getSessionQuestionsAndAnswers(sessionId: string, userId: string) {
			const questions = await database
				.select({
					id: sessionQuestions.id,
					questionType: sessionQuestions.questionType,
					difficultyScore: sessionQuestions.difficultyScore,
					orderIndex: sessionQuestions.orderIndex
				})
				.from(sessionQuestions)
				.where(eq(sessionQuestions.sessionId, sessionId))
				.orderBy(asc(sessionQuestions.orderIndex));

			const answers = await database
				.select({
					sessionQuestionId: sessionAnswers.sessionQuestionId,
					isCorrect: sessionAnswers.isCorrect
				})
				.from(sessionAnswers)
				.innerJoin(sessionQuestions, eq(sessionAnswers.sessionQuestionId, sessionQuestions.id))
				.where(and(eq(sessionQuestions.sessionId, sessionId), eq(sessionAnswers.userId, userId)));

			return { questions, answers };
		},

		async resetUserMastery(userId: string) {
			await database.transaction(async (tx) => {
				await tx
					.delete(sessionCategoryMasteryChanges)
					.where(eq(sessionCategoryMasteryChanges.userId, userId));
				await tx.delete(userCategoryMastery).where(eq(userCategoryMastery.userId, userId));
			});
		},

		async persistMasteryUpdate(data) {
			await database.transaction(async (tx) => {
				await tx
					.insert(sessionCategoryMasteryChanges)
					.values({
						sessionId: data.change.sessionId,
						userId: data.change.userId,
						questionType: data.change.questionType,
						ratingBefore: data.change.ratingBefore,
						ratingAfter: data.change.ratingAfter,
						ratingDelta: data.change.ratingDelta,
						ratedQuestions: data.change.ratedQuestions,
						correctAnswers: data.change.correctAnswers
					})
					.onConflictDoNothing({
						target: [
							sessionCategoryMasteryChanges.sessionId,
							sessionCategoryMasteryChanges.questionType
						]
					});

				const [existing] = await tx
					.select()
					.from(userCategoryMastery)
					.where(
						and(
							eq(userCategoryMastery.userId, data.mastery.userId),
							eq(userCategoryMastery.questionType, data.mastery.questionType)
						)
					)
					.limit(1);

				if (existing) {
					await tx
						.update(userCategoryMastery)
						.set({
							rating: data.mastery.rating,
							totalQuestions: data.mastery.totalQuestions,
							correctAnswers: data.mastery.correctAnswers,
							totalSessions: data.mastery.totalSessions,
							updatedAt: new Date()
						})
						.where(eq(userCategoryMastery.id, existing.id));
				} else {
					await tx
						.insert(userCategoryMastery)
						.values({
							userId: data.mastery.userId,
							questionType: data.mastery.questionType,
							rating: data.mastery.rating,
							totalQuestions: data.mastery.totalQuestions,
							correctAnswers: data.mastery.correctAnswers,
							totalSessions: data.mastery.totalSessions,
							ratingVersion: MASTERY_RATING_VERSION
						})
						.onConflictDoUpdate({
							target: [userCategoryMastery.userId, userCategoryMastery.questionType],
							set: {
								rating: data.mastery.rating,
								totalQuestions: data.mastery.totalQuestions,
								correctAnswers: data.mastery.correctAnswers,
								totalSessions: data.mastery.totalSessions,
								updatedAt: new Date()
							}
						});
				}
			});
		}
	};
}

/**
 * Replays sessions and computes category mastery calibration using the given data provider.
 */
export async function executeMasteryReplay(
	provider: BackfillDataProvider,
	options: BackfillReplayOptions = {}
): Promise<BackfillSummary> {
	const dryRun = options.dryRun ?? false;
	const recomputeAll = options.recomputeAll ?? false;

	const targetUserIds = options.userId ? [options.userId] : await provider.getEligibleUserIds();

	const userResults: BackfillUserResult[] = [];
	let totalSessionsProcessed = 0;
	let totalSessionsSkipped = 0;

	for (const userId of targetUserIds) {
		if (recomputeAll && !dryRun) {
			await provider.resetUserMastery(userId);
		}

		const processedSessionIds = recomputeAll
			? new Set<string>()
			: await provider.getExistingProcessedSessionIds(userId);

		const masteryStateMap = recomputeAll
			? new Map<QuestionType, CategoryMasteryState>()
			: await provider.getExistingMasteryState(userId);

		const sessions = await provider.getEligibleSessions(userId);

		let userProcessed = 0;
		let userSkipped = 0;

		for (const session of sessions) {
			if (!isMasteryEligibleChallengeType(session.challengeType)) {
				userSkipped++;
				continue;
			}

			if (!recomputeAll && processedSessionIds.has(session.id)) {
				userSkipped++;
				continue;
			}

			const { questions, answers } = await provider.getSessionQuestionsAndAnswers(
				session.id,
				userId
			);

			if (questions.length === 0 || answers.length === 0) {
				userSkipped++;
				continue;
			}

			const answerMap = new Map(answers.map((a) => [a.sessionQuestionId, a]));
			const questionsByType = new Map<QuestionType, MasteryQuestionResult[]>();

			for (const q of questions) {
				const ans = answerMap.get(q.id);
				if (!ans) continue;
				const list = questionsByType.get(q.questionType) ?? [];
				list.push({
					difficultyScore: q.difficultyScore,
					isCorrect: ans.isCorrect
				});
				questionsByType.set(q.questionType, list);
			}

			for (const [qType, qList] of questionsByType.entries()) {
				if (qList.length === 0) continue;

				const currentState = masteryStateMap.get(qType) ?? {
					rating: Math.max(0, session.ratingBefore),
					totalQuestions: 0,
					correctAnswers: 0,
					totalSessions: 0
				};

				const updateResult = calculateCategoryMasteryUpdate({
					currentRating: currentState.rating,
					totalQuestions: currentState.totalQuestions,
					totalSessions: currentState.totalSessions,
					questions: qList
				});

				const nextState: CategoryMasteryState = {
					rating: updateResult.ratingAfter,
					totalQuestions: currentState.totalQuestions + updateResult.ratedQuestions,
					correctAnswers: currentState.correctAnswers + updateResult.correctAnswers,
					totalSessions: currentState.totalSessions + 1
				};
				masteryStateMap.set(qType, nextState);

				if (!dryRun) {
					await provider.persistMasteryUpdate({
						change: {
							sessionId: session.id,
							userId,
							questionType: qType,
							ratingBefore: updateResult.ratingBefore,
							ratingAfter: updateResult.ratingAfter,
							ratingDelta: updateResult.ratingDelta,
							ratedQuestions: updateResult.ratedQuestions,
							correctAnswers: updateResult.correctAnswers
						},
						mastery: {
							userId,
							questionType: qType,
							rating: nextState.rating,
							totalQuestions: nextState.totalQuestions,
							correctAnswers: nextState.correctAnswers,
							totalSessions: nextState.totalSessions
						}
					});
				}
			}

			userProcessed++;
			processedSessionIds.add(session.id);
		}

		const categoriesUpdated: Record<string, CategoryMasteryState> = {};
		for (const [k, v] of masteryStateMap.entries()) {
			categoriesUpdated[k] = v;
		}

		userResults.push({
			userId,
			sessionsProcessed: userProcessed,
			sessionsSkipped: userSkipped,
			categoriesUpdated
		});

		totalSessionsProcessed += userProcessed;
		totalSessionsSkipped += userSkipped;
	}

	return {
		totalUsers: targetUserIds.length,
		totalSessionsProcessed,
		totalSessionsSkipped,
		userResults,
		dryRun
	};
}

/**
 * Convenience entry point using the default Drizzle database provider.
 */
export async function backfillCategoryMastery(
	options: BackfillOptions = {}
): Promise<BackfillSummary> {
	const db = options.database ?? getDb();
	const provider = createDrizzleBackfillProvider(db);
	return executeMasteryReplay(provider, options);
}
