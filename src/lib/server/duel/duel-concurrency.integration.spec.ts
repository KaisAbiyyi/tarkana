import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import {
	usersProfile,
	challengeSessions,
	sessionQuestions,
	categories,
	challengeDuels,
	duelParticipants
} from '$lib/server/db/schema';
import { createDuelRepository } from '$lib/server/db/repositories/duel-repository';
import { hashGuestToken } from '$lib/server/sessions/guest-token';

describe('Real Database Duel Concurrency Integration', () => {
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
						name: 'Duel Concurrency Category',
						slug: 'duel-concurrency-category',
						description: 'For duel concurrency integration tests'
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

	it('atomically creates duel participant and handles concurrent accepts with 0 orphan sessions', async () => {
		if (!isDbAvailable || !db) {
			console.log('Test skipped (no live DB connection)');
			expect(true).toBe(true);
			return;
		}

		const creatorUserId = '00000000-0000-4000-8000-000000000031';
		const participantUserId = '00000000-0000-4000-8000-000000000032';
		const creatorSessionId = '00000000-0000-4000-8000-000000000033';
		const duelId = '00000000-0000-4000-8000-000000000034';
		const duelPublicId = 'test_duel_conc_01';

		// Clean up any remnants
		await db.delete(duelParticipants).where(eq(duelParticipants.duelId, duelId));
		await db.delete(challengeDuels).where(eq(challengeDuels.id, duelId));
		await db.delete(challengeSessions).where(eq(challengeSessions.userId, participantUserId));
		await db.delete(challengeSessions).where(eq(challengeSessions.id, creatorSessionId));
		await db.delete(usersProfile).where(eq(usersProfile.id, participantUserId));
		await db.delete(usersProfile).where(eq(usersProfile.id, creatorUserId));

		// 1. Insert creator and participant profiles
		await db.insert(usersProfile).values([
			{
				id: creatorUserId,
				displayName: 'DuelCreator',
				rating: 1200,
				rank: 'Bronze Mind',
				role: 'user'
			},
			{
				id: participantUserId,
				displayName: 'DuelParticipant',
				rating: 1250,
				rank: 'Silver Solver',
				role: 'user'
			}
		]);

		// 2. Insert creator challenge session
		await db.insert(challengeSessions).values({
			id: creatorSessionId,
			userId: creatorUserId,
			challengeType: 'standard',
			status: 'completed',
			totalQuestions: 2,
			totalScore: 800,
			accuracy: 100,
			totalTimeSeconds: 60
		});

		// 3. Insert challenge duel
		const puzzleSnapshot = [
			{
				orderIndex: 0,
				categoryId: testCategoryId,
				questionType: 'number_sequence' as const,
				prompt: 'What comes next in 2, 4, 6?',
				choices: ['7', '8', '9', '10'],
				correctAnswer: '8',
				explanation: 'Even numbers',
				difficultyScore: 100,
				timeLimitSeconds: 60,
				metadata: {},
				generatedSeed: 'seed-1'
			},
			{
				orderIndex: 1,
				categoryId: testCategoryId,
				questionType: 'number_sequence' as const,
				prompt: 'What comes next in 1, 3, 5?',
				choices: ['6', '7', '8', '9'],
				correctAnswer: '7',
				explanation: 'Odd numbers',
				difficultyScore: 100,
				timeLimitSeconds: 60,
				metadata: {},
				generatedSeed: 'seed-2'
			}
		];

		const [createdDuel] = await db
			.insert(challengeDuels)
			.values({
				id: duelId,
				publicId: duelPublicId,
				creatorSessionId,
				creatorUserId,
				creatorDisplayName: 'DuelCreator',
				creatorScore: 800,
				creatorAccuracy: 100,
				creatorTotalTimeSeconds: 60,
				sourceChallengeType: 'standard',
				totalQuestions: 2,
				puzzleSnapshot,
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
			})
			.returning();

		const duelRepo = createDuelRepository(db);

		// 4. Concurrently spawn participant sessions for participantUserId
		const [res1, res2] = await Promise.all([
			duelRepo.spawnParticipantSessionTransaction({
				duel: createdDuel,
				userId: participantUserId,
				guestToken: null,
				guestTokenHash: null,
				displayName: 'DuelParticipant',
				userRating: 1250,
				userRank: 'Silver Solver'
			}),
			duelRepo.spawnParticipantSessionTransaction({
				duel: createdDuel,
				userId: participantUserId,
				guestToken: null,
				guestTokenHash: null,
				displayName: 'DuelParticipant',
				userRating: 1250,
				userRank: 'Silver Solver'
			})
		]);

		// Both should succeed and agree on canonical session and participant
		expect(res1.session.id).toBe(res2.session.id);
		expect(res1.participant.id).toBe(res2.participant.id);
		expect([res1.isNew, res2.isNew].sort()).toEqual([false, true]);

		// Verify database state: exactly 1 participant session, 1 participant record, and exactly 2 questions (no orphans)
		const userSessions = await db
			.select()
			.from(challengeSessions)
			.where(eq(challengeSessions.userId, participantUserId));
		expect(userSessions.length).toBe(1);
		expect(userSessions[0].challengeType).toBe('duel');

		const storedParticipants = await db
			.select()
			.from(duelParticipants)
			.where(eq(duelParticipants.duelId, duelId));
		expect(storedParticipants.length).toBe(1);
		expect(storedParticipants[0].userId).toBe(participantUserId);
		expect(storedParticipants[0].sessionId).toBe(res1.session.id);

		const questions = await db
			.select()
			.from(sessionQuestions)
			.where(eq(sessionQuestions.sessionId, res1.session.id));
		expect(questions.length).toBe(2);

		// Clean up
		await db.delete(duelParticipants).where(eq(duelParticipants.duelId, duelId));
		await db.delete(challengeDuels).where(eq(challengeDuels.id, duelId));
		await db.delete(challengeSessions).where(eq(challengeSessions.userId, participantUserId));
		await db.delete(challengeSessions).where(eq(challengeSessions.id, creatorSessionId));
		await db.delete(usersProfile).where(eq(usersProfile.id, participantUserId));
		await db.delete(usersProfile).where(eq(usersProfile.id, creatorUserId));
	});

	it('atomically handles concurrent guest accepts with 0 orphan sessions', async () => {
		if (!isDbAvailable || !db) {
			console.log('Test skipped (no live DB connection)');
			expect(true).toBe(true);
			return;
		}

		const creatorUserId = '00000000-0000-4000-8000-000000000041';
		const creatorSessionId = '00000000-0000-4000-8000-000000000042';
		const duelId = '00000000-0000-4000-8000-000000000043';
		const duelPublicId = 'test_duel_conc_02';
		const guestToken = 'guest_token_concurrency_test_12345';
		const guestTokenHash = hashGuestToken(guestToken);

		// Clean up any remnants
		await db.delete(duelParticipants).where(eq(duelParticipants.duelId, duelId));
		await db.delete(challengeDuels).where(eq(challengeDuels.id, duelId));
		await db.delete(challengeSessions).where(eq(challengeSessions.guestToken, guestTokenHash));
		await db.delete(challengeSessions).where(eq(challengeSessions.id, creatorSessionId));
		await db.delete(usersProfile).where(eq(usersProfile.id, creatorUserId));

		// 1. Insert creator profile and session
		await db.insert(usersProfile).values({
			id: creatorUserId,
			displayName: 'DuelCreator2',
			rating: 1200,
			rank: 'Bronze Mind',
			role: 'user'
		});

		await db.insert(challengeSessions).values({
			id: creatorSessionId,
			userId: creatorUserId,
			challengeType: 'standard',
			status: 'completed',
			totalQuestions: 1,
			totalScore: 500,
			accuracy: 100,
			totalTimeSeconds: 30
		});

		const [createdDuel] = await db
			.insert(challengeDuels)
			.values({
				id: duelId,
				publicId: duelPublicId,
				creatorSessionId,
				creatorUserId,
				creatorDisplayName: 'DuelCreator2',
				creatorScore: 500,
				creatorAccuracy: 100,
				creatorTotalTimeSeconds: 30,
				sourceChallengeType: 'standard',
				totalQuestions: 1,
				puzzleSnapshot: [
					{
						orderIndex: 0,
						categoryId: testCategoryId,
						questionType: 'number_sequence' as const,
						prompt: 'What is 10 + 10?',
						choices: ['10', '20', '30'],
						correctAnswer: '20',
						explanation: 'Simple math',
						difficultyScore: 50,
						timeLimitSeconds: 60,
						metadata: {},
						generatedSeed: 'seed-guest-1'
					}
				],
				expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
			})
			.returning();

		const duelRepo = createDuelRepository(db);

		// Concurrently spawn participant sessions for guestTokenHash
		const [res1, res2] = await Promise.all([
			duelRepo.spawnParticipantSessionTransaction({
				duel: createdDuel,
				userId: null,
				guestToken,
				guestTokenHash,
				displayName: 'Guest Challenger',
				userRating: 0,
				userRank: 'Unranked'
			}),
			duelRepo.spawnParticipantSessionTransaction({
				duel: createdDuel,
				userId: null,
				guestToken,
				guestTokenHash,
				displayName: 'Guest Challenger',
				userRating: 0,
				userRank: 'Unranked'
			})
		]);

		expect(res1.session.id).toBe(res2.session.id);
		expect(res1.participant.id).toBe(res2.participant.id);
		expect([res1.isNew, res2.isNew].sort()).toEqual([false, true]);

		const guestSessions = await db
			.select()
			.from(challengeSessions)
			.where(eq(challengeSessions.guestToken, guestTokenHash));
		expect(guestSessions.length).toBe(1);

		const storedParticipants = await db
			.select()
			.from(duelParticipants)
			.where(eq(duelParticipants.duelId, duelId));
		expect(storedParticipants.length).toBe(1);
		expect(storedParticipants[0].guestTokenHash).toBe(guestTokenHash);

		// Clean up
		await db.delete(duelParticipants).where(eq(duelParticipants.duelId, duelId));
		await db.delete(challengeDuels).where(eq(challengeDuels.id, duelId));
		await db.delete(challengeSessions).where(eq(challengeSessions.guestToken, guestTokenHash));
		await db.delete(challengeSessions).where(eq(challengeSessions.id, creatorSessionId));
		await db.delete(usersProfile).where(eq(usersProfile.id, creatorUserId));
	});
});
