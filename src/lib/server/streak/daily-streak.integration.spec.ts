import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { inArray } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import {
	challengeSessions,
	dailyChallengeAttempts,
	dailyChallenges,
	usersProfile
} from '$lib/server/db/schema';
import { createDailyRepository } from '$lib/server/db/repositories/daily-repository';
import { evaluateDailyStreak } from './daily-streak';

describe('Real Database Daily Streak Source Query', () => {
	const dbUrl =
		process.env.TEST_DATABASE_URL ||
		(process.env.DATABASE_URL?.includes('localhost') ? process.env.DATABASE_URL : null);

	let pool: pg.Pool | null = null;
	let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
	let isDbAvailable = false;

	const userId = '00000000-0000-4000-8000-0000000005a1';
	const otherUserId = '00000000-0000-4000-8000-0000000005a2';
	const guestTokenHash = 'f'.repeat(64);
	// Far-future dates avoid collisions with real or other test snapshots.
	const dates = ['2098-03-01', '2098-03-02', '2098-03-03', '2098-03-04', '2098-03-05'];
	const dailyIds = dates.map((_, i) => `00000000-0000-4000-8000-0000000005b${i}`);

	async function cleanup() {
		if (!db) return;
		await db
			.delete(dailyChallengeAttempts)
			.where(inArray(dailyChallengeAttempts.dailyChallengeId, dailyIds));
		await db.delete(dailyChallenges).where(inArray(dailyChallenges.id, dailyIds));
		await db.delete(challengeSessions).where(inArray(challengeSessions.id, sessionIdsForCleanup()));
		await db.delete(usersProfile).where(inArray(usersProfile.id, [userId, otherUserId]));
	}

	function sessionId(n: number) {
		return `00000000-0000-4000-8000-0000000005c${n.toString(16)}`;
	}

	function sessionIdsForCleanup() {
		return Array.from({ length: 16 }, (_, n) => sessionId(n));
	}

	async function insertAttempt(input: {
		n: number;
		dayIndex: number;
		userId: string | null;
		guestTokenHash?: string | null;
		status?: 'completed' | 'abandoned' | 'in_progress';
		isOfficial?: boolean;
		isSuspicious?: boolean;
	}) {
		const status = input.status ?? 'completed';
		await db!.insert(challengeSessions).values({
			id: sessionId(input.n),
			userId: input.userId,
			challengeType: 'daily',
			status,
			totalQuestions: 10,
			ratingBefore: 0,
			ratingAfter: 0,
			rankBefore: 'Unranked',
			rankAfter: 'Unranked',
			isSuspicious: input.isSuspicious ?? false
		});
		await db!.insert(dailyChallengeAttempts).values({
			dailyChallengeId: dailyIds[input.dayIndex],
			sessionId: sessionId(input.n),
			userId: input.userId,
			guestTokenHash: input.guestTokenHash ?? null,
			distinctId: `streak-dist-${input.n}`,
			isOfficial: input.isOfficial ?? true,
			status,
			score: 10,
			accuracy: 0.5,
			totalTimeSeconds: 60,
			completedAt: status === 'completed' ? new Date() : null
		});
	}

	beforeAll(async () => {
		if (!dbUrl) {
			console.log('Skipping real-DB streak test: No TEST_DATABASE_URL or localhost DATABASE_URL.');
			return;
		}
		try {
			pool = new pg.Pool({ connectionString: dbUrl, connectionTimeoutMillis: 3000 });
			const client = await pool.connect();
			await client.query('SELECT 1');
			client.release();
			db = drizzle(pool, { schema });
			isDbAvailable = true;

			await cleanup();
			await db.insert(usersProfile).values([
				{ id: userId, displayName: 'StreakTester', rating: 0, rank: 'Unranked' },
				{ id: otherUserId, displayName: 'OtherStreakTester', rating: 0, rank: 'Unranked' }
			]);
			await db.insert(dailyChallenges).values(
				dates.map((challengeDate, i) => ({
					id: dailyIds[i],
					challengeDate,
					seed: `streak_test_seed_${i}`,
					totalQuestions: 10,
					puzzleSnapshot: []
				}))
			);

			// User: days 0, 1 completed; day 2 suspicious; day 3 abandoned; day 4 completed
			// plus an unofficial duplicate on day 4.
			await insertAttempt({ n: 0, dayIndex: 0, userId });
			await insertAttempt({ n: 1, dayIndex: 1, userId });
			await insertAttempt({ n: 2, dayIndex: 2, userId, isSuspicious: true });
			await insertAttempt({ n: 3, dayIndex: 3, userId, status: 'abandoned' });
			await insertAttempt({ n: 4, dayIndex: 4, userId });
			await insertAttempt({ n: 5, dayIndex: 4, userId, isOfficial: false });
			// Another user's completion must never leak into this user's streak.
			await insertAttempt({ n: 6, dayIndex: 2, userId: otherUserId });
			// Guest: days 3 and 4 completed under a guest token.
			await insertAttempt({ n: 7, dayIndex: 3, userId: null, guestTokenHash });
			await insertAttempt({ n: 8, dayIndex: 4, userId: null, guestTokenHash });
		} catch (err: unknown) {
			console.warn('Could not prepare streak test database. Skipping.', (err as Error).message);
			isDbAvailable = false;
		}
	});

	afterAll(async () => {
		if (isDbAvailable) await cleanup();
		if (pool) await pool.end();
	});

	it('returns only completed, official, non-suspicious dates for the user, ascending and distinct', async () => {
		if (!isDbAvailable || !db) {
			console.log('Test skipped (no live DB connection)');
			return;
		}

		const repo = createDailyRepository(db);
		const userDates = await repo.listCompletedDailyDates({ userId });
		expect(userDates).toEqual(['2098-03-01', '2098-03-02', '2098-03-05']);

		// Day 2 (suspicious) and day 3 (abandoned) are missing, so the streak restarted.
		expect(evaluateDailyStreak(userDates, '2098-03-05')).toMatchObject({
			state: 'safe',
			currentStreak: 1,
			longestStreak: 2
		});
	});

	it('scopes guest dates to unclaimed attempts for that guest token', async () => {
		if (!isDbAvailable || !db) {
			console.log('Test skipped (no live DB connection)');
			return;
		}

		const repo = createDailyRepository(db);
		expect(await repo.listCompletedDailyDates({ guestTokenHash })).toEqual([
			'2098-03-04',
			'2098-03-05'
		]);
		expect(await repo.listCompletedDailyDates({ guestTokenHash: '0'.repeat(64) })).toEqual([]);
	});
});
