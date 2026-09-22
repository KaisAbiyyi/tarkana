import { and, desc, eq, isNull } from 'drizzle-orm';
import { getDb, type Database } from '$lib/server/db';
import {
	dailyChallenges,
	dailyChallengeAttempts,
	type DailyChallenge,
	type DailyChallengeAttempt,
	type NewDailyChallenge,
	type NewDailyChallengeAttempt
} from '$lib/server/db/schema';

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
		}
	};
}
