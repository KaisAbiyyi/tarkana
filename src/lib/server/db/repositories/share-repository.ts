import { and, desc, eq } from 'drizzle-orm';
import { getDb, type Database } from '$lib/server/db';
import { sharedResults, type SharedResult } from '$lib/server/db/schema';

export interface CreateShareInput {
	sessionId: string;
	userId: string | null;
	publicId: string;
}

export interface ShareRepository {
	createShare(input: CreateShareInput): Promise<SharedResult>;
	findShareByPublicId(publicId: string): Promise<SharedResult | null>;
	findActiveShareBySessionId(sessionId: string): Promise<SharedResult | null>;
	revokeShare(publicId: string): Promise<SharedResult | null>;
}

export function createShareRepository(database: Database = getDb()): ShareRepository {
	return {
		async createShare(input) {
			const [created] = await database
				.insert(sharedResults)
				.values({
					sessionId: input.sessionId,
					userId: input.userId,
					publicId: input.publicId,
					isRevoked: false
				})
				.returning();

			if (!created) {
				throw new Error('Failed to create shared result');
			}
			return created;
		},

		async findShareByPublicId(publicId) {
			const [share] = await database
				.select()
				.from(sharedResults)
				.where(eq(sharedResults.publicId, publicId))
				.limit(1);

			return share ?? null;
		},

		async findActiveShareBySessionId(sessionId) {
			const [share] = await database
				.select()
				.from(sharedResults)
				.where(and(eq(sharedResults.sessionId, sessionId), eq(sharedResults.isRevoked, false)))
				.orderBy(desc(sharedResults.createdAt))
				.limit(1);

			return share ?? null;
		},

		async revokeShare(publicId) {
			const [updated] = await database
				.update(sharedResults)
				.set({
					isRevoked: true,
					revokedAt: new Date(),
					updatedAt: new Date()
				})
				.where(eq(sharedResults.publicId, publicId))
				.returning();

			return updated ?? null;
		}
	};
}
