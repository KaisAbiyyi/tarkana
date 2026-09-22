import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createSessionRepository } from '$lib/server/db/repositories/session-repository';
import * as schema from '$lib/server/db/schema';
import {
	usersProfile,
	challengeSessions,
	sessionQuestions,
	sessionAnswers
} from '$lib/server/db/schema';
import { eq, or } from 'drizzle-orm';

describe('Real Database Guest Claim Concurrency Integration', () => {
	const dbUrl =
		process.env.TEST_DATABASE_URL ||
		(process.env.DATABASE_URL?.includes('localhost') ? process.env.DATABASE_URL : null);

	let pool: pg.Pool | null = null;
	let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
	let isDbAvailable = false;

	beforeAll(async () => {
		if (!dbUrl) {
			console.log(
				'Skipping real-DB integration test: No TEST_DATABASE_URL or localhost DATABASE_URL configured.'
			);
			return;
		}

		try {
			pool = new pg.Pool({
				connectionString: dbUrl,
				connectionTimeoutMillis: 3000
			});
			const client = await pool.connect();
			await client.query('SELECT 1');
			client.release();
			db = drizzle(pool, { schema });
			isDbAvailable = true;
		} catch (err: unknown) {
			console.warn(
				'Could not connect to test database. Integration test will skip.',
				(err as Error).message
			);
			if (pool) await pool.end();
			pool = null;
		}
	});

	afterAll(async () => {
		if (pool) {
			await pool.end();
		}
	});

	it('serializes concurrent claims of the same guest session so only one user succeeds', async () => {
		if (!isDbAvailable || !db) {
			console.log('Test skipped (no live DB connection)');
			expect(true).toBe(true);
			return;
		}

		const userAId = '00000000-0000-4000-8000-000000000010';
		const userBId = '00000000-0000-4000-8000-000000000011';
		const guestSessionId = '00000000-0000-4000-8000-000000000012';
		const guestToken = 'guest_token_concurrent_test_1234567890abcdef1234567890abcdef12345678';

		// Clean up any test records from prior runs
		await db
			.delete(sessionAnswers)
			.where(or(eq(sessionAnswers.userId, userAId), eq(sessionAnswers.userId, userBId)));
		await db.delete(sessionQuestions).where(eq(sessionQuestions.sessionId, guestSessionId));
		await db.delete(challengeSessions).where(eq(challengeSessions.id, guestSessionId));
		await db
			.delete(usersProfile)
			.where(or(eq(usersProfile.id, userAId), eq(usersProfile.id, userBId)));

		// Seed User A and User B
		await db.insert(usersProfile).values([
			{
				id: userAId,
				displayName: 'ClaimerA',
				rating: 100,
				rank: 'Bronze Mind'
			},
			{
				id: userBId,
				displayName: 'ClaimerB',
				rating: 100,
				rank: 'Bronze Mind'
			}
		]);

		// Seed an unclaimed completed guest session
		await db.insert(challengeSessions).values({
			id: guestSessionId,
			userId: null,
			guestToken,
			challengeType: 'quick',
			status: 'completed',
			totalQuestions: 1,
			ratingBefore: 0,
			ratingAfter: 40,
			ratingDelta: 40,
			rankBefore: 'Unranked',
			rankAfter: 'Bronze Mind'
		});

		const repository = createSessionRepository(db);

		// Fire concurrent claims from User A and User B
		const results = await Promise.allSettled([
			repository.claimGuestSession({
				sessionId: guestSessionId,
				guestToken,
				userId: userAId
			}),
			repository.claimGuestSession({
				sessionId: guestSessionId,
				guestToken,
				userId: userBId
			})
		]);

		const fulfilled = results.filter((r) => r.status === 'fulfilled');
		const rejected = results.filter((r) => r.status === 'rejected');

		// Exactly one claim must succeed; the other must be rejected
		expect(fulfilled).toHaveLength(1);
		expect(rejected).toHaveLength(1);

		const winningUserId = (fulfilled[0] as PromiseFulfilledResult<any>).value.session.userId;
		expect([userAId, userBId]).toContain(winningUserId);

		// The loser must have received an already claimed error
		const rejectionError = (rejected[0] as PromiseRejectedResult).reason;
		expect(rejectionError.message).toMatch(/already been claimed/i);

		// Second claim by the winner must be idempotent
		const idempotentResult = await repository.claimGuestSession({
			sessionId: guestSessionId,
			guestToken,
			userId: winningUserId
		});
		expect(idempotentResult.alreadyClaimed).toBe(true);

		// Verify winning user profile was updated with rating delta (+40)
		const [winnerProfile] = await db
			.select()
			.from(usersProfile)
			.where(eq(usersProfile.id, winningUserId))
			.limit(1);
		expect(winnerProfile?.rating).toBe(140);
	});
});
