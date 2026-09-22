import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';
import * as schema from '$lib/server/db/schema';
import {
	usersProfile,
	dailyChallenges,
	dailyChallengeAttempts,
	challengeSessions
} from '$lib/server/db/schema';
import { createDailyRepository } from '$lib/server/db/repositories/daily-repository';
import { hashGuestToken } from '$lib/server/sessions/guest-token';

describe('Real Database Daily Leaderboard Integration', () => {
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

	it('strictly enforces canonical tie-breaking, exclusions, and guest hypothetical rank in PostgreSQL', async () => {
		if (!isDbAvailable || !db || !pool) {
			console.log('Test skipped (no live DB connection)');
			expect(true).toBe(true);
			return;
		}

		const testDailyId = '00000000-0000-4000-8000-000000000050';
		const testDate = '2099-05-01';

		// Clean up previous runs
		await db
			.delete(dailyChallengeAttempts)
			.where(eq(dailyChallengeAttempts.dailyChallengeId, testDailyId));
		await db.delete(dailyChallenges).where(eq(dailyChallenges.id, testDailyId));

		// Insert Daily Challenge snapshot
		await db.insert(dailyChallenges).values({
			id: testDailyId,
			challengeDate: testDate,
			configVersion: 1,
			generatorVersion: 1,
			seed: 'test_seed_leaderboard',
			totalQuestions: 10,
			puzzleSnapshot: []
		});

		const makeUserId = (num: number) => `00000000-0000-4000-8000-${String(num).padStart(12, '0')}`;
		const makeSessionId = (num: number) =>
			`00000000-0000-4000-8001-${String(num).padStart(12, '0')}`;

		// Clean up test users
		for (let i = 1; i <= 10; i++) {
			await db.delete(challengeSessions).where(eq(challengeSessions.id, makeSessionId(i)));
			await db.delete(usersProfile).where(eq(usersProfile.id, makeUserId(i)));
		}

		// Helper to create profile + session + completed attempt
		async function createPlayerWithAttempt({
			num,
			displayName,
			score,
			accuracy,
			totalTimeSeconds,
			completedAt,
			isOfficial = true,
			isSuspicious = false,
			status = 'completed' as const
		}: {
			num: number;
			displayName: string;
			score: number;
			accuracy: number;
			totalTimeSeconds: number;
			completedAt: Date;
			isOfficial?: boolean;
			isSuspicious?: boolean;
			status?: 'completed' | 'in_progress' | 'abandoned';
		}) {
			const uId = makeUserId(num);
			const sId = makeSessionId(num);

			await db!.insert(usersProfile).values({
				id: uId,
				displayName,
				rating: 1400,
				rank: 'Gold Analyst'
			});

			await db!.insert(challengeSessions).values({
				id: sId,
				userId: uId,
				challengeType: 'daily',
				status: status === 'completed' ? 'completed' : 'in_progress',
				totalQuestions: 10,
				ratingBefore: 1400,
				ratingAfter: 1400,
				rankBefore: 'Gold Analyst',
				rankAfter: 'Gold Analyst',
				isSuspicious
			});

			await db!.insert(dailyChallengeAttempts).values({
				id: `att-integ-${num}`,
				dailyChallengeId: testDailyId,
				sessionId: sId,
				userId: uId,
				distinctId: `dist-${num}`,
				isOfficial,
				status,
				score,
				accuracy,
				totalTimeSeconds,
				completedAt: status === 'completed' ? completedAt : null
			});
		}

		// 1. Setup Official Candidates to test Tie-Breaking Hierarchy:
		// Rule: score DESC → accuracy DESC → totalTimeSeconds ASC → completedAt ASC → id ASC
		// User E: score 950 -> should be #1
		await createPlayerWithAttempt({
			num: 5,
			displayName: 'UserE_950',
			score: 950,
			accuracy: 0.8,
			totalTimeSeconds: 60,
			completedAt: new Date('2026-05-01T12:00:00Z')
		});

		// User B: score 900, accuracy 0.95 -> should beat other 900s (#2)
		await createPlayerWithAttempt({
			num: 2,
			displayName: 'UserB_900_Acc95',
			score: 900,
			accuracy: 0.95,
			totalTimeSeconds: 50,
			completedAt: new Date('2026-05-01T12:00:00Z')
		});

		// User C: score 900, accuracy 0.90, time 40 -> beats time 50 (#3)
		await createPlayerWithAttempt({
			num: 3,
			displayName: 'UserC_900_Time40',
			score: 900,
			accuracy: 0.9,
			totalTimeSeconds: 40,
			completedAt: new Date('2026-05-01T12:00:00Z')
		});

		// User D: score 900, accuracy 0.90, time 50, completed 09:00 -> beats 10:00 (#4)
		await createPlayerWithAttempt({
			num: 4,
			displayName: 'UserD_900_Time50_Early',
			score: 900,
			accuracy: 0.9,
			totalTimeSeconds: 50,
			completedAt: new Date('2026-05-01T09:00:00Z')
		});

		// User A: score 900, accuracy 0.90, time 50, completed 10:00 -> (#5)
		await createPlayerWithAttempt({
			num: 1,
			displayName: 'UserA_900_Time50_Late',
			score: 900,
			accuracy: 0.9,
			totalTimeSeconds: 50,
			completedAt: new Date('2026-05-01T10:00:00Z')
		});

		// 2. Setup Exclusions:
		// User Suspicious (num: 6) -> isSuspicious = true -> MUST BE EXCLUDED
		await createPlayerWithAttempt({
			num: 6,
			displayName: 'User_Cheater',
			score: 1000,
			accuracy: 1.0,
			totalTimeSeconds: 10,
			completedAt: new Date('2026-05-01T08:00:00Z'),
			isSuspicious: true
		});

		// User Unofficial (num: 7) -> isOfficial = false -> MUST BE EXCLUDED
		await createPlayerWithAttempt({
			num: 7,
			displayName: 'User_Unofficial',
			score: 980,
			accuracy: 1.0,
			totalTimeSeconds: 15,
			completedAt: new Date('2026-05-01T08:00:00Z'),
			isOfficial: false
		});

		// User In Progress (num: 8) -> status = 'in_progress' -> MUST BE EXCLUDED
		await createPlayerWithAttempt({
			num: 8,
			displayName: 'User_InProgress',
			score: 0,
			accuracy: 0,
			totalTimeSeconds: 0,
			completedAt: new Date(),
			status: 'in_progress'
		});

		// 3. Setup Guest Attempt:
		const rawGuestToken = 'test-integ-guest-token-12345';
		const guestHash = hashGuestToken(rawGuestToken);
		const guestSessionId = makeSessionId(9);

		await db.insert(challengeSessions).values({
			id: guestSessionId,
			userId: null,
			challengeType: 'daily',
			status: 'completed',
			totalQuestions: 10,
			ratingBefore: 0,
			ratingAfter: 0,
			rankBefore: 'Unranked',
			rankAfter: 'Unranked',
			isSuspicious: false
		});

		await db.insert(dailyChallengeAttempts).values({
			id: 'att-integ-guest-9',
			dailyChallengeId: testDailyId,
			sessionId: guestSessionId,
			userId: null,
			guestTokenHash: guestHash,
			distinctId: 'guest-dist-9',
			isOfficial: true,
			status: 'completed',
			score: 920, // Guest scored 920! (Between User E: 950 and User B: 900)
			accuracy: 0.92,
			totalTimeSeconds: 45,
			completedAt: new Date('2026-05-01T11:00:00Z')
		});

		const dailyRepo = createDailyRepository(db);

		// 4. Verify Official Leaderboard & Canonical Tie-Breaking
		const leaderboard = await dailyRepo.getDailyLeaderboard({
			dailyChallengeId: testDailyId,
			limit: 10,
			offset: 0
		});

		// Total official participants must be strictly 5 (excluding cheater, unofficial, in-progress, guest)
		expect(leaderboard.totalParticipants).toBe(5);
		expect(leaderboard.items).toHaveLength(5);

		// Exact sequence verification:
		expect(leaderboard.items[0].displayName).toBe('UserE_950');
		expect(leaderboard.items[0].position).toBe(1);

		expect(leaderboard.items[1].displayName).toBe('UserB_900_Acc95');
		expect(leaderboard.items[1].position).toBe(2);

		expect(leaderboard.items[2].displayName).toBe('UserC_900_Time40');
		expect(leaderboard.items[2].position).toBe(3);

		expect(leaderboard.items[3].displayName).toBe('UserD_900_Time50_Early');
		expect(leaderboard.items[3].position).toBe(4);

		expect(leaderboard.items[4].displayName).toBe('UserA_900_Time50_Late');
		expect(leaderboard.items[4].position).toBe(5);

		// 5. Verify User Specific Position
		const userCPos = await dailyRepo.getUserDailyPosition({
			dailyChallengeId: testDailyId,
			userId: makeUserId(3)
		});
		expect(userCPos).not.toBeNull();
		expect(userCPos?.position).toBe(3);
		expect(userCPos?.displayName).toBe('UserC_900_Time40');

		// 6. Verify Around-Me Window
		const aroundC = await dailyRepo.getAroundMeDailyLeaderboard({
			dailyChallengeId: testDailyId,
			userId: makeUserId(3),
			windowSize: 1
		});
		expect(aroundC).toHaveLength(3);
		expect(aroundC.map((r) => r.position)).toEqual([2, 3, 4]);
		expect(aroundC.map((r) => r.displayName)).toEqual([
			'UserB_900_Acc95',
			'UserC_900_Time40',
			'UserD_900_Time50_Early'
		]);

		// 7. Verify Guest Hypothetical Position
		// Score 920 should hypothetically rank #2 (behind UserE_950, ahead of UserB_900_Acc95)
		const guestPos = await dailyRepo.getGuestHypotheticalPosition({
			dailyChallengeId: testDailyId,
			guestTokenHash: guestHash
		});
		expect(guestPos).not.toBeNull();
		expect(guestPos?.hypotheticalPosition).toBe(2);
		expect(guestPos?.score).toBe(920);

		// 8. PostgreSQL Query Plan EXPLAIN Verification
		const explainResult = await db.execute(sql`
			EXPLAIN (FORMAT JSON)
			WITH ranked_attempts AS (
				SELECT
					ROW_NUMBER() OVER (
						ORDER BY
							dca.score DESC,
							dca.accuracy DESC,
							dca.total_time_seconds ASC,
							dca.completed_at ASC,
							dca.id ASC
					) AS position,
					dca.user_id,
					up.display_name,
					up.rank AS logic_rank,
					dca.score,
					dca.accuracy,
					dca.total_time_seconds,
					dca.completed_at
				FROM daily_challenge_attempts dca
				INNER JOIN challenge_sessions cs ON cs.id = dca.session_id
				INNER JOIN users_profile up ON up.id = dca.user_id
				WHERE dca.daily_challenge_id = ${testDailyId}
					AND dca.user_id IS NOT NULL
					AND dca.is_official = true
					AND dca.status = 'completed'
					AND cs.is_suspicious = false
			)
			SELECT * FROM ranked_attempts LIMIT 10;
		`);

		expect(explainResult.rows).toBeDefined();
		expect(explainResult.rows.length).toBeGreaterThan(0);
	});
});
