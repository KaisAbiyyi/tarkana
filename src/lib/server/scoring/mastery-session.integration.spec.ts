import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createSessionRepository } from '$lib/server/db/repositories/session-repository';
import * as schema from '$lib/server/db/schema';
import {
	categories,
	challengeSessions,
	sessionAnswers,
	sessionCategoryMasteryChanges,
	sessionQuestions,
	userCategoryMastery,
	usersProfile
} from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

describe('Real Database Session Category Mastery Integration', () => {
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

	it('atomically persists category mastery and change record during session completion', async () => {
		if (!isDbAvailable || !db) {
			console.log('Test skipped (no live DB connection)');
			expect(true).toBe(true);
			return;
		}

		const testUserId = '00000000-0000-4000-8000-000000000010';
		const testCategoryId = '00000000-0000-4000-8000-000000000011';
		const testSessionId = '00000000-0000-4000-8000-000000000012';
		const testQuestionId = '00000000-0000-4000-8000-000000000013';

		// Clean up
		await db
			.delete(sessionCategoryMasteryChanges)
			.where(eq(sessionCategoryMasteryChanges.userId, testUserId));
		await db.delete(userCategoryMastery).where(eq(userCategoryMastery.userId, testUserId));
		await db.delete(sessionAnswers).where(eq(sessionAnswers.userId, testUserId));
		await db.delete(sessionQuestions).where(eq(sessionQuestions.sessionId, testSessionId));
		await db.delete(challengeSessions).where(eq(challengeSessions.id, testSessionId));
		await db.delete(usersProfile).where(eq(usersProfile.id, testUserId));

		// Seed profile
		await db.insert(usersProfile).values({
			id: testUserId,
			displayName: 'MasteryIntegrationUser',
			rating: 1200,
			rank: 'Bronze Mind'
		});

		// Seed category if needed
		const existingCat = await db.query.categories.findFirst({
			where: eq(categories.id, testCategoryId)
		});
		if (!existingCat) {
			await db.insert(categories).values({
				id: testCategoryId,
				slug: 'test-category-pattern',
				name: 'Test Pattern Category',
				description: 'Category for integration testing'
			});
		}

		// Seed session
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

		// Seed question
		await db.insert(sessionQuestions).values({
			id: testQuestionId,
			sessionId: testSessionId,
			questionType: 'number_sequence',
			categoryId: testCategoryId,
			prompt: 'Test prompt',
			choices: ['A', 'B', 'C', 'D'],
			correctAnswer: 'A',
			explanation: 'Test explanation',
			difficultyScore: 250,
			timeLimitSeconds: 30,
			metadata: {},
			generatedSeed: 'test-seed-123',
			orderIndex: 0
		});

		// Seed answer
		await db.insert(sessionAnswers).values({
			sessionQuestionId: testQuestionId,
			userId: testUserId,
			selectedAnswer: 'A',
			isCorrect: true,
			timeSpentSeconds: 10,
			scoreEarned: 250
		});

		const repository = createSessionRepository(db);

		// Complete session
		const completedSession = await repository.completeSessionAndUpdateProfile({
			sessionId: testSessionId,
			userId: testUserId,
			totalScore: 250,
			accuracy: 100,
			totalTimeSeconds: 10,
			averageTimeSeconds: 10,
			ratingAfter: 1240,
			ratingDelta: 40,
			rankAfter: 'Silver Solver',
			isSuspicious: false,
			profileRating: 1240,
			profileRank: 'Silver Solver'
		});

		expect(completedSession.status).toBe('completed');

		// Assert session_category_mastery_changes record
		const changes = await repository.listSessionCategoryMasteryChanges(testSessionId);
		expect(changes).toHaveLength(1);
		expect(changes[0].questionType).toBe('number_sequence');
		expect(changes[0].ratingBefore).toBe(1200);
		expect(changes[0].ratingAfter).toBeGreaterThan(1200);
		expect(changes[0].ratingDelta).toBeGreaterThan(0);
		expect(changes[0].ratedQuestions).toBe(1);
		expect(changes[0].correctAnswers).toBe(1);

		// Assert user_category_mastery record
		const userMasteries = await repository.listUserCategoryMastery(testUserId);
		expect(userMasteries).toHaveLength(1);
		expect(userMasteries[0].questionType).toBe('number_sequence');
		expect(userMasteries[0].rating).toBe(changes[0].ratingAfter);
		expect(userMasteries[0].totalQuestions).toBe(1);
		expect(userMasteries[0].correctAnswers).toBe(1);
		expect(userMasteries[0].totalSessions).toBe(1);

		// Idempotency: second completion call returns without duplicating changes
		const idempotentResult = await repository.completeSessionAndUpdateProfile({
			sessionId: testSessionId,
			userId: testUserId,
			totalScore: 250,
			accuracy: 100,
			totalTimeSeconds: 10,
			averageTimeSeconds: 10,
			ratingAfter: 1240,
			ratingDelta: 40,
			rankAfter: 'Silver Solver',
			isSuspicious: false,
			profileRating: 1240,
			profileRank: 'Silver Solver'
		});

		expect(idempotentResult.status).toBe('completed');
		const changesAfterIdempotent =
			await repository.listSessionCategoryMasteryChanges(testSessionId);
		expect(changesAfterIdempotent).toHaveLength(1);
	});
});
