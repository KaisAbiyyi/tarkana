import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import {
	usersProfile,
	dailyChallenges,
	dailyChallengeAttempts,
	challengeSessions,
	sessionQuestions,
	categories
} from '$lib/server/db/schema';
import { createDailyRepository } from '$lib/server/db/repositories/daily-repository';
import { hashGuestToken } from '$lib/server/sessions/guest-token';

describe('Real Database Daily Challenge Concurrency Integration', () => {
	const dbUrl =
		process.env.TEST_DATABASE_URL ||
		(process.env.DATABASE_URL?.includes('localhost') ? process.env.DATABASE_URL : null);

	let pool: pg.Pool | null = null;
	let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
	let isDbAvailable = false;
	let testCategoryId = '00000000-0000-4000-8000-000000000001';

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

			// Ensure a valid category exists for session_questions FK
			const [existingCat] = await db.select({ id: categories.id }).from(categories).limit(1);
			if (existingCat) {
				testCategoryId = existingCat.id;
			} else {
				const [insertedCat] = await db
					.insert(categories)
					.values({
						name: 'Concurrency Test Category',
						slug: 'concurrency-test-category',
						description: 'For concurrency integration tests'
					})
					.returning({ id: categories.id });
				testCategoryId = insertedCat.id;
			}
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

	it('atomically creates daily attempt and handles concurrent starts with 0 orphan sessions', async () => {
		if (!isDbAvailable || !db) {
			console.log('Test skipped (no live DB connection)');
			expect(true).toBe(true);
			return;
		}

		const testUserId = '00000000-0000-4000-8000-000000000010';
		const testDailyId = '00000000-0000-4000-8000-000000000020';
		const testDate = '2099-01-01';

		// Clean up any remnants
		await db
			.delete(dailyChallengeAttempts)
			.where(eq(dailyChallengeAttempts.dailyChallengeId, testDailyId));
		await db.delete(dailyChallenges).where(eq(dailyChallenges.id, testDailyId));
		await db.delete(challengeSessions).where(eq(challengeSessions.userId, testUserId));
		await db.delete(usersProfile).where(eq(usersProfile.id, testUserId));

		// 1. Insert clean profile and daily challenge snapshot
		await db.insert(usersProfile).values({
			id: testUserId,
			displayName: 'DailyConcurrencyTester',
			rating: 1300,
			rank: 'Silver Solver'
		});

		const mockSnapshotQuestions = Array.from({ length: 10 }, (_, i) => ({
			orderIndex: i,
			categoryId: testCategoryId,
			questionType: 'number_sequence' as const,
			prompt: `Test question ${i}`,
			choices: ['A', 'B', 'C', 'D'],
			correctAnswer: 'A',
			explanation: 'Explanation',
			difficultyScore: 100,
			timeLimitSeconds: 30,
			metadata: {},
			generatedSeed: `test:daily:${testDate}:${i}`
		}));

		await db.insert(dailyChallenges).values({
			id: testDailyId,
			challengeDate: testDate,
			configVersion: 1,
			generatorVersion: 1,
			seed: 'test_seed_1234567890abcdef',
			totalQuestions: 10,
			puzzleSnapshot: mockSnapshotQuestions
		});

		const dailyRepo = createDailyRepository(db);

		// 2. Fire 10 simultaneous atomic start requests for the same user
		const concurrentStarts = Array.from({ length: 10 }, (_, idx) =>
			dailyRepo.startDailySessionAtomic({
				dailyChallengeId: testDailyId,
				totalQuestions: 10,
				questions: mockSnapshotQuestions,
				userId: testUserId,
				rawGuestToken: null,
				guestTokenHash: null,
				distinctId: `dist-${idx}`,
				userRating: 1300,
				userRank: 'Silver Solver'
			})
		);

		const results = await Promise.all(concurrentStarts);

		// 3. Verify all 10 returned successfully and point to the same session
		const first = results[0];
		if (first.type !== 'created' && first.type !== 'resumed') {
			throw new Error(`Expected created or resumed, got ${first.type}`);
		}
		const firstSessionId = first.session.id;
		expect(firstSessionId).toBeTruthy();

		for (const res of results) {
			if (res.type !== 'created' && res.type !== 'resumed') {
				throw new Error(`Expected created or resumed, got ${res.type}`);
			}
			expect(res.session.id).toBe(firstSessionId);
			expect(res.currentQuestion.orderIndex).toBe(0);
		}

		// 4. Verify database state directly: exactly 1 session, 10 questions, 1 attempt
		const dbSessions = await db
			.select()
			.from(challengeSessions)
			.where(eq(challengeSessions.userId, testUserId));
		expect(dbSessions).toHaveLength(1);
		expect(dbSessions[0].id).toBe(firstSessionId);

		const dbQuestions = await db
			.select()
			.from(sessionQuestions)
			.where(eq(sessionQuestions.sessionId, firstSessionId));
		expect(dbQuestions).toHaveLength(10); // NOT 100! 0 orphan questions!

		const dbAttempts = await db
			.select()
			.from(dailyChallengeAttempts)
			.where(eq(dailyChallengeAttempts.dailyChallengeId, testDailyId));
		expect(dbAttempts).toHaveLength(1);
		expect(dbAttempts[0].sessionId).toBe(firstSessionId);
		expect(dbAttempts[0].isOfficial).toBe(true);

		// 5. Clean up
		await db
			.delete(dailyChallengeAttempts)
			.where(eq(dailyChallengeAttempts.dailyChallengeId, testDailyId));
		await db.delete(sessionQuestions).where(eq(sessionQuestions.sessionId, firstSessionId));
		await db.delete(challengeSessions).where(eq(challengeSessions.id, firstSessionId));
		await db.delete(dailyChallenges).where(eq(dailyChallenges.id, testDailyId));
		await db.delete(usersProfile).where(eq(usersProfile.id, testUserId));
	});

	it('atomically handles guest Daily starts and resumes canonical session', async () => {
		if (!isDbAvailable || !db) {
			console.log('Test skipped (no live DB connection)');
			expect(true).toBe(true);
			return;
		}

		const testDailyId = '00000000-0000-4000-8000-000000000021';
		const testDate = '2099-01-02';
		const rawGuestToken = 'test_guest_token_abcdef1234567890';
		const guestTokenHash = hashGuestToken(rawGuestToken);

		// Clean up
		await db
			.delete(dailyChallengeAttempts)
			.where(eq(dailyChallengeAttempts.dailyChallengeId, testDailyId));
		await db.delete(dailyChallenges).where(eq(dailyChallenges.id, testDailyId));

		const mockSnapshotQuestions = Array.from({ length: 10 }, (_, i) => ({
			orderIndex: i,
			categoryId: testCategoryId,
			questionType: 'number_sequence' as const,
			prompt: `Test guest question ${i}`,
			choices: ['A', 'B', 'C', 'D'],
			correctAnswer: 'A',
			explanation: 'Explanation',
			difficultyScore: 100,
			timeLimitSeconds: 30,
			metadata: {},
			generatedSeed: `test:daily:guest:${testDate}:${i}`
		}));

		await db.insert(dailyChallenges).values({
			id: testDailyId,
			challengeDate: testDate,
			configVersion: 1,
			generatorVersion: 1,
			seed: 'test_seed_guest_1234567890abcdef',
			totalQuestions: 10,
			puzzleSnapshot: mockSnapshotQuestions
		});

		const dailyRepo = createDailyRepository(db);

		// Fire 5 concurrent guest starts
		const concurrentStarts = Array.from({ length: 5 }, (_, idx) =>
			dailyRepo.startDailySessionAtomic({
				dailyChallengeId: testDailyId,
				totalQuestions: 10,
				questions: mockSnapshotQuestions,
				userId: null,
				rawGuestToken,
				guestTokenHash,
				distinctId: `dist-guest-${idx}`,
				userRating: 0,
				userRank: 'Unranked'
			})
		);

		const results = await Promise.all(concurrentStarts);
		const first = results[0];
		if (first.type !== 'created' && first.type !== 'resumed') {
			throw new Error(`Expected created or resumed, got ${first.type}`);
		}
		const canonicalSessionId = first.session.id;

		for (const res of results) {
			if (res.type !== 'created' && res.type !== 'resumed') {
				throw new Error(`Expected created or resumed, got ${res.type}`);
			}
			expect(res.session.id).toBe(canonicalSessionId);
		}

		// Verify exactly 1 guest session with guest_token = guestTokenHash
		const dbSessions = await db
			.select()
			.from(challengeSessions)
			.where(eq(challengeSessions.id, canonicalSessionId));
		expect(dbSessions).toHaveLength(1);
		expect(dbSessions[0].guestToken).toBe(guestTokenHash); // Hashed once!

		// Clean up
		await db
			.delete(dailyChallengeAttempts)
			.where(eq(dailyChallengeAttempts.dailyChallengeId, testDailyId));
		await db.delete(sessionQuestions).where(eq(sessionQuestions.sessionId, canonicalSessionId));
		await db.delete(challengeSessions).where(eq(challengeSessions.id, canonicalSessionId));
		await db.delete(dailyChallenges).where(eq(dailyChallenges.id, testDailyId));
	});
});
