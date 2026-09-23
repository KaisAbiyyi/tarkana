import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import { db as defaultDb } from '$lib/server/db';
import {
	challengeDuels,
	challengeSessions,
	duelParticipants,
	sessionQuestions,
	type ChallengeDuel,
	type ChallengeSession,
	type DuelParticipant,
	type NewChallengeDuel,
	type NewDuelParticipant,
	type SessionQuestion
} from '$lib/server/db/schema';
import { hashGuestToken } from '$lib/server/sessions/guest-token';
import type { RankName } from '$lib/shared/constants/rank';

export interface CompleteParticipantInput {
	sessionId: string;
	score: number;
	accuracy: number;
	totalTimeSeconds: number;
	isSuspicious: boolean;
	completedAt: Date;
}

export interface SpawnParticipantInput {
	duel: ChallengeDuel;
	userId: string | null;
	guestToken: string | null;
	guestTokenHash: string | null;
	displayName: string;
	userRating: number;
	userRank: RankName;
}

export interface SpawnParticipantResult {
	session: ChallengeSession;
	participant: DuelParticipant;
	questions: SessionQuestion[];
	isNew: boolean;
}

export interface DuelRepository {
	createDuel(data: NewChallengeDuel): Promise<ChallengeDuel>;
	findDuelByPublicId(publicId: string): Promise<ChallengeDuel | null>;
	findActiveDuelBySessionId(sessionId: string): Promise<ChallengeDuel | null>;
	findDuelById(id: string): Promise<ChallengeDuel | null>;
	revokeDuel(publicId: string): Promise<void>;

	addParticipant(data: NewDuelParticipant): Promise<DuelParticipant>;
	spawnParticipantSessionTransaction(input: SpawnParticipantInput): Promise<SpawnParticipantResult>;
	findParticipantBySessionId(sessionId: string): Promise<DuelParticipant | null>;
	findParticipantByUser(duelId: string, userId: string): Promise<DuelParticipant | null>;
	findParticipantByGuest(duelId: string, guestTokenHash: string): Promise<DuelParticipant | null>;
	findParticipantsByDuelId(duelId: string): Promise<DuelParticipant[]>;
	completeParticipant(input: CompleteParticipantInput): Promise<void>;

	claimGuestDuelParticipants(input: {
		guestTokenHash: string;
		userId: string;
	}): Promise<{ claimedCount: number }>;
	claimGuestCreatedDuels(input: {
		claimedSessionIds: string[];
		userId: string;
	}): Promise<{ claimedCount: number }>;
}

export function createDuelRepository(database = defaultDb): DuelRepository {
	return {
		async createDuel(data) {
			const [inserted] = await database
				.insert(challengeDuels)
				.values(data)
				.onConflictDoNothing()
				.returning();

			if (inserted) {
				return inserted;
			}

			// Concurrency conflict: return the existing canonical active duel for this session
			const existing = await this.findActiveDuelBySessionId(data.creatorSessionId);
			if (existing) {
				return existing;
			}

			throw new Error('Failed to create or retrieve active challenge duel');
		},

		async findDuelByPublicId(publicId) {
			const [duel] = await database
				.select()
				.from(challengeDuels)
				.where(eq(challengeDuels.publicId, publicId))
				.limit(1);

			return duel ?? null;
		},

		async findActiveDuelBySessionId(sessionId) {
			const [duel] = await database
				.select()
				.from(challengeDuels)
				.where(
					and(eq(challengeDuels.creatorSessionId, sessionId), eq(challengeDuels.isRevoked, false))
				)
				.limit(1);

			return duel ?? null;
		},

		async findDuelById(id) {
			const [duel] = await database
				.select()
				.from(challengeDuels)
				.where(eq(challengeDuels.id, id))
				.limit(1);

			return duel ?? null;
		},

		async revokeDuel(publicId) {
			await database
				.update(challengeDuels)
				.set({
					isRevoked: true,
					revokedAt: new Date(),
					updatedAt: new Date()
				})
				.where(eq(challengeDuels.publicId, publicId));
		},

		async addParticipant(data) {
			const [inserted] = await database
				.insert(duelParticipants)
				.values(data)
				.onConflictDoNothing()
				.returning();

			if (inserted) {
				return inserted;
			}

			// Conflict: find existing participant record for actor
			if (data.userId) {
				const existing = await this.findParticipantByUser(data.duelId, data.userId);
				if (existing) return existing;
			} else if (data.guestTokenHash) {
				const existing = await this.findParticipantByGuest(data.duelId, data.guestTokenHash);
				if (existing) return existing;
			}

			throw new Error('Failed to create or retrieve duel participant');
		},

		async spawnParticipantSessionTransaction(
			input: SpawnParticipantInput
		): Promise<SpawnParticipantResult> {
			try {
				return await database.transaction(async (tx) => {
					// 1. Check if participant already exists for this actor in this duel
					let existingParticipant: DuelParticipant | null = null;
					if (input.userId) {
						const [p] = await tx
							.select()
							.from(duelParticipants)
							.where(
								and(
									eq(duelParticipants.duelId, input.duel.id),
									eq(duelParticipants.userId, input.userId)
								)
							)
							.limit(1);
						existingParticipant = p ?? null;
					} else if (input.guestTokenHash) {
						const [p] = await tx
							.select()
							.from(duelParticipants)
							.where(
								and(
									eq(duelParticipants.duelId, input.duel.id),
									eq(duelParticipants.guestTokenHash, input.guestTokenHash),
									isNull(duelParticipants.userId)
								)
							)
							.limit(1);
						existingParticipant = p ?? null;
					}

					if (existingParticipant) {
						const [session] = await tx
							.select()
							.from(challengeSessions)
							.where(eq(challengeSessions.id, existingParticipant.sessionId))
							.limit(1);
						const questions = await tx
							.select()
							.from(sessionQuestions)
							.where(eq(sessionQuestions.sessionId, existingParticipant.sessionId))
							.orderBy(asc(sessionQuestions.orderIndex));

						return {
							session: session!,
							participant: existingParticipant,
							questions,
							isNew: false
						};
					}

					// 2. Spawn session in transaction
					const [newSession] = await tx
						.insert(challengeSessions)
						.values({
							userId: input.userId,
							guestToken: input.guestToken ? hashGuestToken(input.guestToken) : null,
							challengeType: 'duel',
							status: 'in_progress',
							totalQuestions: input.duel.totalQuestions,
							ratingBefore: input.userRating,
							ratingAfter: input.userRating,
							rankBefore: input.userRank,
							rankAfter: input.userRank
						})
						.returning();

					if (!newSession) throw new Error('Could not create duel challenge session');

					// 3. Replay exact puzzle snapshot questions
					const createdQuestions = await tx
						.insert(sessionQuestions)
						.values(
							input.duel.puzzleSnapshot.map((q) => ({
								sessionId: newSession.id,
								categoryId: q.categoryId,
								questionType: q.questionType,
								prompt: q.prompt,
								choices: q.choices,
								correctAnswer: q.correctAnswer,
								explanation: q.explanation,
								difficultyScore: q.difficultyScore,
								timeLimitSeconds: q.timeLimitSeconds,
								metadata: q.metadata ?? {},
								generatedSeed: '',
								orderIndex: q.orderIndex
							}))
						)
						.returning();

					// 4. Insert participant record without onConflictDoNothing
					// Any concurrent race on unique constraint will throw and rollback this tx!
					const [participant] = await tx
						.insert(duelParticipants)
						.values({
							duelId: input.duel.id,
							sessionId: newSession.id,
							userId: input.userId,
							guestTokenHash: input.userId ? null : input.guestTokenHash,
							displayName: input.displayName,
							status: 'in_progress'
						})
						.returning();

					return {
						session: newSession,
						participant: participant!,
						questions: createdQuestions.sort((a, b) => a.orderIndex - b.orderIndex),
						isNew: true
					};
				});
			} catch (err: unknown) {
				const isUniqueConflict =
					(err &&
						typeof err === 'object' &&
						'code' in err &&
						(err as { code: string }).code === '23505') ||
					(err instanceof Error && err.message.toLowerCase().includes('unique'));

				if (isUniqueConflict) {
					// The concurrent transaction won and committed. The losing session and questions
					// were rolled back cleanly by PostgreSQL. Query the winning canonical participant!
					let canonicalParticipant: DuelParticipant | null = null;
					if (input.userId) {
						canonicalParticipant = await this.findParticipantByUser(input.duel.id, input.userId);
					} else if (input.guestTokenHash) {
						canonicalParticipant = await this.findParticipantByGuest(
							input.duel.id,
							input.guestTokenHash
						);
					}

					if (canonicalParticipant) {
						const [session] = await database
							.select()
							.from(challengeSessions)
							.where(eq(challengeSessions.id, canonicalParticipant.sessionId))
							.limit(1);
						const questions = await database
							.select()
							.from(sessionQuestions)
							.where(eq(sessionQuestions.sessionId, canonicalParticipant.sessionId))
							.orderBy(asc(sessionQuestions.orderIndex));

						if (session) {
							return {
								session,
								participant: canonicalParticipant,
								questions,
								isNew: false
							};
						}
					}
				}
				throw err;
			}
		},

		async findParticipantBySessionId(sessionId) {
			const [participant] = await database
				.select()
				.from(duelParticipants)
				.where(eq(duelParticipants.sessionId, sessionId))
				.limit(1);

			return participant ?? null;
		},

		async findParticipantByUser(duelId, userId) {
			const [participant] = await database
				.select()
				.from(duelParticipants)
				.where(and(eq(duelParticipants.duelId, duelId), eq(duelParticipants.userId, userId)))
				.limit(1);

			return participant ?? null;
		},

		async findParticipantByGuest(duelId, guestTokenHash) {
			const [participant] = await database
				.select()
				.from(duelParticipants)
				.where(
					and(
						eq(duelParticipants.duelId, duelId),
						eq(duelParticipants.guestTokenHash, guestTokenHash),
						isNull(duelParticipants.userId)
					)
				)
				.limit(1);

			return participant ?? null;
		},

		async findParticipantsByDuelId(duelId) {
			return database
				.select()
				.from(duelParticipants)
				.where(eq(duelParticipants.duelId, duelId))
				.orderBy(desc(duelParticipants.completedAt), desc(duelParticipants.createdAt));
		},

		async completeParticipant(input) {
			await database
				.update(duelParticipants)
				.set({
					status: 'completed',
					score: input.score,
					accuracy: input.accuracy,
					totalTimeSeconds: input.totalTimeSeconds,
					isSuspicious: input.isSuspicious,
					completedAt: input.completedAt
				})
				.where(eq(duelParticipants.sessionId, input.sessionId));
		},

		async claimGuestDuelParticipants(input) {
			// Find all guest duel participant records
			const guestParticipants = await database
				.select()
				.from(duelParticipants)
				.where(
					and(
						eq(duelParticipants.guestTokenHash, input.guestTokenHash),
						isNull(duelParticipants.userId)
					)
				);

			let claimedCount = 0;
			for (const gp of guestParticipants) {
				// Check if user already participated in this duel
				const [existing] = await database
					.select({ id: duelParticipants.id })
					.from(duelParticipants)
					.where(
						and(eq(duelParticipants.duelId, gp.duelId), eq(duelParticipants.userId, input.userId))
					)
					.limit(1);

				if (!existing) {
					await database
						.update(duelParticipants)
						.set({ userId: input.userId })
						.where(eq(duelParticipants.id, gp.id));
					claimedCount++;
				}
			}

			return { claimedCount };
		},

		async claimGuestCreatedDuels(input) {
			if (input.claimedSessionIds.length === 0) {
				return { claimedCount: 0 };
			}

			const updated = await database
				.update(challengeDuels)
				.set({
					creatorUserId: input.userId,
					updatedAt: new Date()
				})
				.where(
					and(
						inArray(challengeDuels.creatorSessionId, input.claimedSessionIds),
						isNull(challengeDuels.creatorUserId)
					)
				)
				.returning({ id: challengeDuels.id });

			return { claimedCount: updated.length };
		}
	};
}
