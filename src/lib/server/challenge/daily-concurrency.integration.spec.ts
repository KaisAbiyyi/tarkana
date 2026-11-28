import { randomInt, randomUUID } from 'node:crypto';
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
	categories,
	type DailyPuzzleSnapshotQuestion
} from '$lib/server/db/schema';
import { createDailyRepository } from '$lib/server/db/repositories/daily-repository';
import { hashGuestToken } from '$lib/server/sessions/guest-token';

function makeUniqueFutureDate(): string {
	const year = randomInt(2200, 9999);
	const month = String(randomInt(1, 13)).padStart(2, '0');
	const day = String(randomInt(1, 29)).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function isUniqueViolation(err: unknown): boolean {
	let cur: unknown = err;
	while (cur && typeof cur === 'object') {
		const candidate = cur as { code?: unknown; cause?: unknown };
		if (candidate.code === '23505') return true;
		cur = candidate.cause;
	}
	return false;
}

async function insertDailySnapshotWithUniqueDate(
	db: ReturnType<typeof drizzle<typeof schema>>,
	input: {
		id: string;
		seed: string;
		totalQuestions: number;
		puzzleSnapshot: DailyPuzzleSnapshotQuestion[];
	}
): Promise<string> {
	for (let attempt = 0; attempt < 10; attempt++) {
		const challengeDate = makeUniqueFutureDate();
		try {
			await db.insert(dailyChallenges).values({
				id: input.id,
				challengeDate,
				configVersion: 1,
				generatorVersion: 1,
				seed: input.seed,
				totalQuestions: input.totalQuestions,
				puzzleSnapshot: input.puzzleSnapshot
			});
			return challengeDate;
		} catch (err) {
			if (!isUniqueViolation(err) || attempt === 9) throw err;
		}
	}
	throw new Error('Failed to allocate unique daily challenge date');
}

describe('Real Database Daily Challenge Concurrency Integration', () => {
	const dbUrl =
		process.env.TEST_DATABASE_URL ||
		(process.env.DATABASE_URL?.includes('localhost') ? process.env.DATABASE_URL : null);

	let pool: pg.Pool | null = null;
	let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
	let isDbAvailable = false;
	let testCategoryId = '';

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
				max: 12,
				connectionTimeoutMillis: 5000
			});
			const client = await pool.connect();
			await client.query('SELECT 1');
			client.release();
			db = drizzle(pool, { schema });
			isDbAvailable = true;

			// Ensure a valid category exists for session_questions FK without colliding across parallel workers
			const [existingCat] = await db.select({ id: categories.id }).from(categories).limit(1);
			if (existingCat) {
				testCategoryId = existingCat.id;
			} else {
				await db
					.insert(categories)
					.values({
						name: 'Concurrency Test Category',
						slug: 'concurrency-test-category',
						description: 'For concurrency integration tests'
					})
					.onConflictDoNothing({ target: categories.slug });
				const [resolvedCat] = await db.select({ id: categories.id }).from(categories).limit(1);
				if (!resolvedCat) {
					throw new Error('Failed to resolve or insert category for daily concurrency tests');
				}
				testCategoryId = resolvedCat.id;
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

		const runId = randomUUID();
		const testUserId = randomUUID();
		const testDailyId = randomUUID();
		let createdSessionId: string | null = null;

		try {
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
				generatedSeed: `test:daily:${runId}:${i}`
			}));

			await insertDailySnapshotWithUniqueDate(db, {
				id: testDailyId,
				seed: `test_seed_${runId}`,
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
					distinctId: `dist-${runId}-${idx}`,
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
			createdSessionId = firstSessionId;
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
		} finally {
			await db
				.delete(dailyChallengeAttempts)
				.where(eq(dailyChallengeAttempts.dailyChallengeId, testDailyId));
			if (createdSessionId) {
				await db.delete(sessionQuestions).where(eq(sessionQuestions.sessionId, createdSessionId));
			}
			await db.delete(challengeSessions).where(eq(challengeSessions.userId, testUserId));
			await db.delete(dailyChallenges).where(eq(dailyChallenges.id, testDailyId));
			await db.delete(usersProfile).where(eq(usersProfile.id, testUserId));
		}
	}, 15_000);

	it('atomically handles guest Daily starts and resumes canonical session', async () => {
		if (!isDbAvailable || !db) {
			console.log('Test skipped (no live DB connection)');
			expect(true).toBe(true);
			return;
		}

		const runId = randomUUID();
		const testDailyId = randomUUID();
		const rawGuestToken = `test_guest_token_${runId}`;
		const guestTokenHash = hashGuestToken(rawGuestToken);
		let canonicalSessionId: string | null = null;

		try {
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
				generatedSeed: `test:daily:guest:${runId}:${i}`
			}));

			await insertDailySnapshotWithUniqueDate(db, {
				id: testDailyId,
				seed: `test_seed_guest_${runId}`,
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
					distinctId: `dist-guest-${runId}-${idx}`,
					userRating: 0,
					userRank: 'Unranked'
				})
			);

			const results = await Promise.all(concurrentStarts);
			const first = results[0];
			if (first.type !== 'created' && first.type !== 'resumed') {
				throw new Error(`Expected created or resumed, got ${first.type}`);
			}
			canonicalSessionId = first.session.id;

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
		} finally {
			await db
				.delete(dailyChallengeAttempts)
				.where(eq(dailyChallengeAttempts.dailyChallengeId, testDailyId));
			if (canonicalSessionId) {
				await db.delete(sessionQuestions).where(eq(sessionQuestions.sessionId, canonicalSessionId));
				await db.delete(challengeSessions).where(eq(challengeSessions.id, canonicalSessionId));
			}
			await db.delete(challengeSessions).where(eq(challengeSessions.dailyChallengeId, testDailyId));
			await db.delete(dailyChallenges).where(eq(dailyChallenges.id, testDailyId));
		}
	}, 15_000);
});
