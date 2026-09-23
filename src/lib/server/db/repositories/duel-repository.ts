import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { db as defaultDb } from '$lib/server/db';
import {
	challengeDuels,
	duelParticipants,
	type ChallengeDuel,
	type DuelParticipant,
	type NewChallengeDuel,
	type NewDuelParticipant
} from '$lib/server/db/schema';

export interface CompleteParticipantInput {
	sessionId: string;
	score: number;
	accuracy: number;
	totalTimeSeconds: number;
	isSuspicious: boolean;
	completedAt: Date;
}

export interface DuelRepository {
	createDuel(data: NewChallengeDuel): Promise<ChallengeDuel>;
	findDuelByPublicId(publicId: string): Promise<ChallengeDuel | null>;
	findActiveDuelBySessionId(sessionId: string): Promise<ChallengeDuel | null>;
	findDuelById(id: string): Promise<ChallengeDuel | null>;
	revokeDuel(publicId: string): Promise<void>;

	addParticipant(data: NewDuelParticipant): Promise<DuelParticipant>;
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
