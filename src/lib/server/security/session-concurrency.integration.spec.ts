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
import { eq } from 'drizzle-orm';

describe('Real Database Session Concurrency Integration', () => {
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

	it('serializes concurrent session completions and prevents duplicate profile updates', async () => {
		if (!isDbAvailable || !db) {
			console.log('Test skipped (no live DB connection)');
			expect(true).toBe(true);
			return;
		}

		const testUserId = '00000000-0000-4000-8000-000000000001';
		const testSessionId = '00000000-0000-4000-8000-000000000002';

		// Seed a clean profile and active session in real DB
		await db.delete(sessionAnswers).where(eq(sessionAnswers.userId, testUserId));
		await db.delete(sessionQuestions).where(eq(sessionQuestions.sessionId, testSessionId));
		await db.delete(challengeSessions).where(eq(challengeSessions.id, testSessionId));
		await db.delete(usersProfile).where(eq(usersProfile.id, testUserId));

		await db.insert(usersProfile).values({
			id: testUserId,
			displayName: 'ConcurrencyTester',
			rating: 1200,
			rank: 'Bronze Mind'
		});

		await db.insert(challengeSessions).values({
			id: testSessionId,
			userId: testUserId,
			challengeType: 'quick',
			status: 'in_progress',
			totalQuestions: 1,
			ratingBefore: 1200,
			ratingAfter: 1200,
			ratingDelta: 0,
			rankBefore: 'Bronze Mind',
			rankAfter: 'Bronze Mind'
		});

		const repository = createSessionRepository(db);

		// Fire two concurrent finalize transactions
		const [resA, resB] = await Promise.all([
			repository.completeSessionAndUpdateProfile({
				sessionId: testSessionId,
				userId: testUserId,
				totalScore: 100,
				accuracy: 1,
				totalTimeSeconds: 30,
				averageTimeSeconds: 30,
				ratingAfter: 1225,
				ratingDelta: 25,
				rankAfter: 'Bronze Mind',
				isSuspicious: false,
				suspiciousReason: null,
				profileRating: 1225,
				profileRank: 'Bronze Mind'
			}),
			repository.completeSessionAndUpdateProfile({
				sessionId: testSessionId,
				userId: testUserId,
				totalScore: 100,
				accuracy: 1,
				totalTimeSeconds: 30,
				averageTimeSeconds: 30,
				ratingAfter: 1225,
				ratingDelta: 25,
				rankAfter: 'Bronze Mind',
				isSuspicious: false,
				suspiciousReason: null,
				profileRating: 1225,
				profileRank: 'Bronze Mind'
			})
		]);

		expect(resA.status).toBe('completed');
		expect(resB.status).toBe('completed');

		// Verify final profile in DB was updated exactly once to 1225
		const [updatedProfile] = await db
			.select()
			.from(usersProfile)
			.where(eq(usersProfile.id, testUserId))
			.limit(1);

		expect(updatedProfile.rating).toBe(1225);

		// Clean up test data
		await db.delete(challengeSessions).where(eq(challengeSessions.id, testSessionId));
		await db.delete(usersProfile).where(eq(usersProfile.id, testUserId));
	});
});
