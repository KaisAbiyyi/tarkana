import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createSessionRepository } from '$lib/server/db/repositories/session-repository';
import { hashGuestToken } from '$lib/server/sessions/guest-token';
import * as schema from '$lib/server/db/schema';
import {
	usersProfile,
	challengeSessions,
	sessionQuestions,
	sessionAnswers
} from '$lib/server/db/schema';
import { eq, inArray, or } from 'drizzle-orm';

describe('Real Database Guest Claim & Auth Isolation Integration', () => {
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

	it('hashes guest token at rest in database and queries with raw token transparently', async () => {
		if (!isDbAvailable || !db) {
			expect(true).toBe(true);
			return;
		}

		const rawGuestToken = 'raw_guest_token_test_1234567890abcdef';
		const expectedHash = hashGuestToken(rawGuestToken);
		const testSessionId = '00000000-0000-4000-8000-000000000001';

		await db.delete(challengeSessions).where(eq(challengeSessions.id, testSessionId));

		const repository = createSessionRepository(db);
		await repository.createSession({
			id: testSessionId,
			userId: null,
			guestToken: rawGuestToken,
			challengeType: 'quick',
			status: 'in_progress',
			totalQuestions: 5,
			ratingBefore: 0,
			ratingAfter: 0,
			rankBefore: 'Unranked',
			rankAfter: 'Unranked'
		});

		// 1. Direct DB select: verify stored column contains the SHA-256 hash, NOT the raw token
		const [rawDbRow] = await db
			.select({ guestToken: challengeSessions.guestToken })
			.from(challengeSessions)
			.where(eq(challengeSessions.id, testSessionId))
			.limit(1);

		expect(rawDbRow?.guestToken).toBe(expectedHash);
		expect(rawDbRow?.guestToken).not.toBe(rawGuestToken);

		// 2. Repository findGuestSession using raw token succeeds
		const session = await repository.findGuestSession(testSessionId, rawGuestToken);
		expect(session).not.toBeNull();
		expect(session?.id).toBe(testSessionId);

		// 3. Repository with incorrect token fails
		const wrongSession = await repository.findGuestSession(testSessionId, 'wrong_token');
		expect(wrongSession).toBeNull();
	});

	it('serializes concurrent claims of the same guest session so only one user succeeds', async () => {
		if (!isDbAvailable || !db) {
			expect(true).toBe(true);
			return;
		}

		const userAId = '00000000-0000-4000-8000-000000000010';
		const userBId = '00000000-0000-4000-8000-000000000011';
		const guestSessionId = '00000000-0000-4000-8000-000000000012';
		const rawGuestToken = 'concurrent_claim_raw_token_xyz_987654';

		// Clean up any test records
		await db
			.delete(sessionAnswers)
			.where(or(eq(sessionAnswers.userId, userAId), eq(sessionAnswers.userId, userBId)));
		await db.delete(sessionQuestions).where(eq(sessionQuestions.sessionId, guestSessionId));
		await db.delete(challengeSessions).where(eq(challengeSessions.id, guestSessionId));
		await db
			.delete(usersProfile)
			.where(or(eq(usersProfile.id, userAId), eq(usersProfile.id, userBId)));

		// Seed User A and User B (new unranked accounts)
		await db.insert(usersProfile).values([
			{
				id: userAId,
				displayName: 'ClaimerA',
				rating: 0,
				rank: 'Unranked'
			},
			{
				id: userBId,
				displayName: 'ClaimerB',
				rating: 0,
				rank: 'Unranked'
			}
		]);

		const repository = createSessionRepository(db);

		// Seed guest session via repository (hashes token)
		await repository.createSession({
			id: guestSessionId,
			userId: null,
			guestToken: rawGuestToken,
			challengeType: 'quick',
			status: 'completed',
			totalQuestions: 1,
			ratingBefore: 0,
			ratingAfter: 40,
			ratingDelta: 40,
			rankBefore: 'Unranked',
			rankAfter: 'Bronze Mind'
		});

		// Fire concurrent claims from User A and User B
		const results = await Promise.allSettled([
			repository.claimAllGuestSessions({
				guestToken: rawGuestToken,
				userId: userAId,
				specificSessionId: guestSessionId
			}),
			repository.claimAllGuestSessions({
				guestToken: rawGuestToken,
				userId: userBId,
				specificSessionId: guestSessionId
			})
		]);

		const fulfilled = results.filter((r) => r.status === 'fulfilled');
		const rejected = results.filter((r) => r.status === 'rejected');

		expect(fulfilled).toHaveLength(1);
		expect(rejected).toHaveLength(1);

		const winningUserId = (fulfilled[0] as PromiseFulfilledResult<any>).value.primarySession.userId;
		expect([userAId, userBId]).toContain(winningUserId);

		// The loser must have received an already claimed / conflict error
		const rejectionError = (rejected[0] as PromiseRejectedResult).reason;
		expect(rejectionError.message).toMatch(/already been claimed|not found/i);

		// Second claim by the winner must be idempotent
		const idempotentResult = await repository.claimAllGuestSessions({
			guestToken: rawGuestToken,
			userId: winningUserId
		});
		expect(idempotentResult.alreadyClaimed).toBe(true);
	});

	it('claims all eligible guest sessions belonging to the token', async () => {
		if (!isDbAvailable || !db) {
			expect(true).toBe(true);
			return;
		}

		const userId = '00000000-0000-4000-8000-000000000020';
		const session1Id = '00000000-0000-4000-8000-000000000021';
		const session2Id = '00000000-0000-4000-8000-000000000022';
		const rawToken = 'multi_session_claim_token_abc_123';

		await db
			.delete(challengeSessions)
			.where(inArray(challengeSessions.id, [session1Id, session2Id]));
		await db.delete(usersProfile).where(eq(usersProfile.id, userId));

		// Seed provisional user
		await db.insert(usersProfile).values({
			id: userId,
			displayName: 'MultiClaimer',
			rating: 0,
			rank: 'Unranked'
		});

		const repository = createSessionRepository(db);

		// Create two guest sessions with same token
		await repository.createSession({
			id: session1Id,
			userId: null,
			guestToken: rawToken,
			challengeType: 'quick',
			status: 'completed',
			totalQuestions: 5,
			ratingBefore: 0,
			ratingAfter: 35,
			ratingDelta: 35,
			rankBefore: 'Unranked',
			rankAfter: 'Bronze Mind'
		});

		await repository.createSession({
			id: session2Id,
			userId: null,
			guestToken: rawToken,
			challengeType: 'standard',
			status: 'completed',
			totalQuestions: 10,
			ratingBefore: 35,
			ratingAfter: 75,
			ratingDelta: 40,
			rankBefore: 'Bronze Mind',
			rankAfter: 'Bronze Mind'
		});

		const claimResult = await repository.claimAllGuestSessions({
			guestToken: rawToken,
			userId
		});

		expect(claimResult.claimedSessions).toHaveLength(2);
		expect(claimResult.isProvisional).toBe(true);

		// Both sessions must now belong to userId
		const claimedRows = await db
			.select()
			.from(challengeSessions)
			.where(inArray(challengeSessions.id, [session1Id, session2Id]));

		expect(claimedRows).toHaveLength(2);
		expect(claimedRows.every((s) => s.userId === userId)).toBe(true);
		expect(claimedRows.every((s) => s.claimedAt !== null)).toBe(true);

		// Profile rating provisionally calibrated sequentially: starting 100 + 35 + 40 = 175
		const [updatedProfile] = await db
			.select()
			.from(usersProfile)
			.where(eq(usersProfile.id, userId))
			.limit(1);

		expect(updatedProfile?.rating).toBe(175);
	});

	it('anti-farming protection: guest sessions claimed by existing active accounts add 0 competitive rating delta', async () => {
		if (!isDbAvailable || !db) {
			expect(true).toBe(true);
			return;
		}

		const existingUserId = '00000000-0000-4000-8000-000000000030';
		const guestSessionId = '00000000-0000-4000-8000-000000000031';
		const rawToken = 'anti_farming_protection_token_555';

		await db.delete(challengeSessions).where(eq(challengeSessions.id, guestSessionId));
		await db.delete(usersProfile).where(eq(usersProfile.id, existingUserId));

		// Seed established competitive player with 1500 rating
		await db.insert(usersProfile).values({
			id: existingUserId,
			displayName: 'ProPlayer',
			rating: 1500,
			rank: 'Platinum Strategist'
		});

		const repository = createSessionRepository(db);

		await repository.createSession({
			id: guestSessionId,
			userId: null,
			guestToken: rawToken,
			challengeType: 'quick',
			status: 'completed',
			totalQuestions: 5,
			ratingBefore: 0,
			ratingAfter: 45,
			ratingDelta: 45,
			rankBefore: 'Unranked',
			rankAfter: 'Bronze Mind'
		});

		const claimResult = await repository.claimAllGuestSessions({
			guestToken: rawToken,
			userId: existingUserId
		});

		expect(claimResult.isProvisional).toBe(false);
		expect(claimResult.profileRating).toBe(1500); // Competitive rating protected!
		expect(claimResult.profileRank).toBe('Platinum Strategist');

		// Verify session record was attached to user with +0 rating delta
		const [sessionRow] = await db
			.select()
			.from(challengeSessions)
			.where(eq(challengeSessions.id, guestSessionId))
			.limit(1);

		expect(sessionRow?.userId).toBe(existingUserId);
		expect(sessionRow?.ratingDelta).toBe(0);
		expect(sessionRow?.ratingBefore).toBe(1500);
		expect(sessionRow?.ratingAfter).toBe(1500);

		// Profile rating was NOT inflated
		const [profileRow] = await db
			.select()
			.from(usersProfile)
			.where(eq(usersProfile.id, existingUserId))
			.limit(1);

		expect(profileRow?.rating).toBe(1500);
		expect(profileRow?.rank).toBe('Platinum Strategist');
	});

	it('auth & tenant isolation: User A cannot access or claim User B sessions or wrong guest token sessions', async () => {
		if (!isDbAvailable || !db) {
			expect(true).toBe(true);
			return;
		}

		const userAId = '00000000-0000-4000-8000-000000000040';
		const userBId = '00000000-0000-4000-8000-000000000041';
		const userBSessionId = '00000000-0000-4000-8000-000000000042';
		const guestSessionId = '00000000-0000-4000-8000-000000000043';
		const tokenGuestA = 'token_for_guest_a_isolation_test_1';
		const tokenGuestB = 'token_for_guest_b_isolation_test_2';

		await db
			.delete(challengeSessions)
			.where(inArray(challengeSessions.id, [userBSessionId, guestSessionId]));
		await db
			.delete(usersProfile)
			.where(or(eq(usersProfile.id, userAId), eq(usersProfile.id, userBId)));

		await db.insert(usersProfile).values([
			{ id: userAId, displayName: 'UserA', rating: 100, rank: 'Bronze Mind' },
			{ id: userBId, displayName: 'UserB', rating: 200, rank: 'Bronze Mind' }
		]);

		const repository = createSessionRepository(db);

		// User B owns userBSessionId
		await repository.createSession({
			id: userBSessionId,
			userId: userBId,
			challengeType: 'quick',
			status: 'completed',
			totalQuestions: 5,
			ratingBefore: 200,
			ratingAfter: 240,
			ratingDelta: 40,
			rankBefore: 'Bronze Mind',
			rankAfter: 'Bronze Mind'
		});

		// Guest session belongs to tokenGuestB
		await repository.createSession({
			id: guestSessionId,
			userId: null,
			guestToken: tokenGuestB,
			challengeType: 'quick',
			status: 'completed',
			totalQuestions: 5,
			ratingBefore: 0,
			ratingAfter: 40,
			ratingDelta: 40,
			rankBefore: 'Unranked',
			rankAfter: 'Bronze Mind'
		});

		// 1. User A queries owned session of User B -> returns null
		const ownedByA = await repository.findOwnedSession(userBSessionId, userAId);
		expect(ownedByA).toBeNull();

		// 2. User A attempts to claim guest session with wrong token (tokenGuestA) -> fails
		await expect(
			repository.claimAllGuestSessions({
				guestToken: tokenGuestA,
				userId: userAId,
				specificSessionId: guestSessionId
			})
		).rejects.toThrow();

		// 3. User A attempts to claim already-owned session of User B -> fails
		await expect(
			repository.claimAllGuestSessions({
				guestToken: tokenGuestB,
				userId: userAId,
				specificSessionId: userBSessionId
			})
		).rejects.toThrow(/already been claimed by another account|not found/i);
	});
});
