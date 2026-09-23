import { describe, expect, it, vi } from 'vitest';
import { createDailyLeaderboardService } from './daily-leaderboard-service';
import {
	createFakeEvent,
	createFakeUser,
	createProfile,
	createProfileRepositoryFake
} from '$lib/server/test/fakes';
import type {
	DailyLeaderboardRow,
	DailyRepository,
	GetDailyLeaderboardOutput,
	GuestHypotheticalPositionOutput
} from '$lib/server/db/repositories/daily-repository';
import type { DailyChallengeService } from '$lib/server/challenge/daily-challenge-service';
import { getUtcDateString } from '$lib/server/challenge/daily-challenge';
import type { DailyChallenge } from '$lib/server/db/schema';

describe('daily leaderboard service', () => {
	function createMockDailyRepo(overrides: Partial<DailyRepository> = {}): DailyRepository {
		return {
			findDailyChallengeByDate: vi.fn(async () => null),
			findDailyChallengeById: vi.fn(async () => null),
			getOrCreateDailyChallenge: vi.fn(async () => ({}) as any),
			findAttemptForUser: vi.fn(async () => null),
			findAttemptForGuest: vi.fn(async () => null),
			createAttempt: vi.fn(async () => ({}) as any),
			findAttemptBySessionId: vi.fn(async () => null),
			completeAttempt: vi.fn(async () => ({}) as any),
			abandonAttempt: vi.fn(async () => {}),
			claimGuestDailyAttempts: vi.fn(async () => ({ claimedCount: 0, demotedCount: 0 })),
			startDailySessionAtomic: vi.fn(async () => ({}) as any),
			getDailyLeaderboard: vi.fn(
				async (): Promise<GetDailyLeaderboardOutput> => ({
					items: [],
					totalParticipants: 0
				})
			),
			getUserDailyPosition: vi.fn(async (): Promise<DailyLeaderboardRow | null> => null),
			getAroundMeDailyLeaderboard: vi.fn(async (): Promise<DailyLeaderboardRow[]> => []),
			getGuestHypotheticalPosition: vi.fn(
				async (): Promise<GuestHypotheticalPositionOutput | null> => null
			),
			...overrides
		};
	}

	function createMockChallengeService(
		overrides: Partial<DailyChallengeService> = {}
	): DailyChallengeService {
		return {
			getOrCreateDailyChallenge: vi.fn(async (dateString) => ({
				id: `daily-${dateString}`,
				challengeDate: dateString ?? '2026-01-01',
				configVersion: 1,
				generatorVersion: 1,
				seed: 'seed-123',
				totalQuestions: 10,
				puzzleSnapshot: [],
				createdAt: new Date()
			})),
			getStatus: vi.fn(async () => ({}) as any),
			start: vi.fn(async () => ({}) as any),
			...overrides
		};
	}

	it('rejects future dates with 400 Bad Request', async () => {
		const dailyRepo = createMockDailyRepo();
		const challengeService = createMockChallengeService();
		const service = createDailyLeaderboardService(
			dailyRepo,
			createProfileRepositoryFake(null),
			challengeService
		);

		const tomorrow = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);
		const event = createFakeEvent(null);

		await expect(service.getLeaderboard(event, { date: tomorrow })).rejects.toThrow(
			'Cannot view leaderboards for future dates'
		);
	});

	it('rejects invalid date formats and invalid calendar dates', async () => {
		const dailyRepo = createMockDailyRepo();
		const challengeService = createMockChallengeService();
		const service = createDailyLeaderboardService(
			dailyRepo,
			createProfileRepositoryFake(null),
			challengeService
		);

		const event = createFakeEvent(null);

		await expect(service.getLeaderboard(event, { date: 'invalid-date' })).rejects.toThrow(
			'Invalid date format. Expected YYYY-MM-DD'
		);

		await expect(service.getLeaderboard(event, { date: '2026-02-30' })).rejects.toThrow(
			'Invalid calendar date'
		);
	});

	it('historical lookup on non-existent dates returns empty without calling generator', async () => {
		const dailyRepo = createMockDailyRepo();
		const challengeService = createMockChallengeService();
		const service = createDailyLeaderboardService(
			dailyRepo,
			createProfileRepositoryFake(null),
			challengeService
		);

		const event = createFakeEvent(null);
		const pastDate = '2025-01-01';

		const result = await service.getLeaderboard(event, { date: pastDate });

		expect(result).toEqual({
			date: pastDate,
			items: [],
			currentUserEntry: null,
			guestHypotheticalEntry: null,
			totalParticipants: 0,
			secondsUntilReset: null,
			limit: 50,
			offset: 0
		});

		expect(dailyRepo.findDailyChallengeByDate).toHaveBeenCalledWith(pastDate);
		expect(challengeService.getOrCreateDailyChallenge).not.toHaveBeenCalled();
	});

	it('generates snapshot for today if missing and returns secondsUntilReset', async () => {
		const today = getUtcDateString();
		const dailyRepo = createMockDailyRepo();
		const challengeService = createMockChallengeService();
		const service = createDailyLeaderboardService(
			dailyRepo,
			createProfileRepositoryFake(null),
			challengeService
		);

		const event = createFakeEvent(null);
		const result = await service.getLeaderboard(event, { date: today });

		expect(challengeService.getOrCreateDailyChallenge).toHaveBeenCalledWith(today);
		expect(result.secondsUntilReset).toBeTypeOf('number');
		expect(result.secondsUntilReset).toBeGreaterThan(0);
	});

	it('projects public DTO without leaking internal IDs or PII', async () => {
		const today = getUtcDateString();
		const sampleDaily: DailyChallenge = {
			id: 'daily-uuid-secret-123',
			challengeDate: today,
			configVersion: 1,
			generatorVersion: 1,
			seed: 'internal-secret-seed',
			totalQuestions: 10,
			puzzleSnapshot: [],
			createdAt: new Date()
		};

		const sampleRow: DailyLeaderboardRow = {
			position: 1,
			userId: 'user-secret-id-999',
			displayName: 'Alice Logic',
			logicRank: 'Master Reasoner',
			score: 950,
			accuracy: 0.954,
			totalTimeSeconds: 42,
			completedAt: new Date('2026-03-01T12:00:00.000Z')
		};

		const dailyRepo = createMockDailyRepo({
			findDailyChallengeByDate: vi.fn(async () => sampleDaily),
			getDailyLeaderboard: vi.fn(async () => ({
				items: [sampleRow],
				totalParticipants: 1
			}))
		});

		const service = createDailyLeaderboardService(
			dailyRepo,
			createProfileRepositoryFake(null),
			createMockChallengeService()
		);

		const event = createFakeEvent(null);
		const result = await service.getLeaderboard(event, { date: today });

		expect(result.items).toHaveLength(1);
		const item = result.items[0];
		expect(item).toEqual({
			position: 1,
			displayName: 'Alice Logic',
			logicRank: 'Master Reasoner',
			score: 950,
			accuracy: 0.95,
			totalTimeSeconds: 42,
			completedAt: '2026-03-01T12:00:00.000Z'
		});

		const serialized = JSON.stringify(result);
		expect(serialized).not.toContain('user-secret-id-999');
		expect(serialized).not.toContain('daily-uuid-secret-123');
		expect(serialized).not.toContain('internal-secret-seed');
		expect(serialized).not.toContain('@');
	});

	it('includes currentUserEntry and sets isCurrent for authenticated solver', async () => {
		const today = getUtcDateString();
		const profile = createProfile({ id: 'user-me-123', displayName: 'Me' });
		const sampleDaily: DailyChallenge = {
			id: 'daily-today',
			challengeDate: today,
			configVersion: 1,
			generatorVersion: 1,
			seed: 'seed',
			totalQuestions: 10,
			puzzleSnapshot: [],
			createdAt: new Date()
		};

		const sampleRow: DailyLeaderboardRow = {
			position: 3,
			userId: profile.id,
			displayName: profile.displayName,
			logicRank: 'Gold Analyst',
			score: 800,
			accuracy: 0.8,
			totalTimeSeconds: 60,
			completedAt: new Date('2026-03-01T12:00:00.000Z')
		};

		const dailyRepo = createMockDailyRepo({
			findDailyChallengeByDate: vi.fn(async () => sampleDaily),
			getDailyLeaderboard: vi.fn(async () => ({
				items: [sampleRow],
				totalParticipants: 10
			})),
			getUserDailyPosition: vi.fn(async () => sampleRow)
		});

		const service = createDailyLeaderboardService(
			dailyRepo,
			createProfileRepositoryFake(profile),
			createMockChallengeService()
		);

		const event = createFakeEvent(createFakeUser({ id: profile.id }));
		event.locals.profile = profile;

		const result = await service.getLeaderboard(event, { date: today });

		expect(result.currentUserEntry).toEqual({
			position: 3,
			displayName: 'Me',
			logicRank: 'Gold Analyst',
			score: 800,
			accuracy: 0.8,
			totalTimeSeconds: 60,
			completedAt: '2026-03-01T12:00:00.000Z',
			isCurrent: true
		});
		expect(result.items[0].isCurrent).toBe(true);
	});

	it('computes guestHypotheticalEntry for guests without adding them to public items', async () => {
		const today = getUtcDateString();
		const sampleDaily: DailyChallenge = {
			id: 'daily-today',
			challengeDate: today,
			configVersion: 1,
			generatorVersion: 1,
			seed: 'seed',
			totalQuestions: 10,
			puzzleSnapshot: [],
			createdAt: new Date()
		};

		const dailyRepo = createMockDailyRepo({
			findDailyChallengeByDate: vi.fn(async () => sampleDaily),
			getDailyLeaderboard: vi.fn(async () => ({
				items: [
					{
						position: 1,
						userId: 'user-1',
						displayName: 'Top Player',
						logicRank: 'Master',
						score: 900,
						accuracy: 0.9,
						totalTimeSeconds: 50,
						completedAt: new Date()
					}
				],
				totalParticipants: 1
			})),
			getGuestHypotheticalPosition: vi.fn(async () => ({
				hypotheticalPosition: 2,
				score: 850,
				accuracy: 0.85,
				totalTimeSeconds: 45
			}))
		});

		const service = createDailyLeaderboardService(
			dailyRepo,
			createProfileRepositoryFake(null),
			createMockChallengeService()
		);

		const event = createFakeEvent(null, { tarkana_guest_token: 'raw-guest-token-12345' });
		const result = await service.getLeaderboard(event, { date: today });

		expect(result.guestHypotheticalEntry).toEqual({
			hypotheticalPosition: 2,
			score: 850,
			accuracy: 0.85,
			totalTimeSeconds: 45
		});
		// Official public items must ONLY contain official users
		expect(result.items).toHaveLength(1);
		expect(result.items[0].displayName).toBe('Top Player');
		expect(result.totalParticipants).toBe(1);
	});

	it('getAroundMe returns window around user or empty if not authenticated', async () => {
		const today = getUtcDateString();
		const profile = createProfile({ id: 'user-me-123', displayName: 'Me' });
		const sampleDaily: DailyChallenge = {
			id: 'daily-today',
			challengeDate: today,
			configVersion: 1,
			generatorVersion: 1,
			seed: 'seed',
			totalQuestions: 10,
			puzzleSnapshot: [],
			createdAt: new Date()
		};

		const rows: DailyLeaderboardRow[] = [
			{
				position: 4,
				userId: 'user-before',
				displayName: 'Before Me',
				logicRank: 'Gold',
				score: 810,
				accuracy: 0.81,
				totalTimeSeconds: 59,
				completedAt: new Date('2026-03-01T12:00:00.000Z')
			},
			{
				position: 5,
				userId: profile.id,
				displayName: profile.displayName,
				logicRank: 'Gold',
				score: 800,
				accuracy: 0.8,
				totalTimeSeconds: 60,
				completedAt: new Date('2026-03-01T12:00:00.000Z')
			},
			{
				position: 6,
				userId: 'user-after',
				displayName: 'After Me',
				logicRank: 'Silver',
				score: 790,
				accuracy: 0.79,
				totalTimeSeconds: 61,
				completedAt: new Date('2026-03-01T12:00:00.000Z')
			}
		];

		const dailyRepo = createMockDailyRepo({
			findDailyChallengeByDate: vi.fn(async () => sampleDaily),
			getAroundMeDailyLeaderboard: vi.fn(async () => rows)
		});

		const service = createDailyLeaderboardService(
			dailyRepo,
			createProfileRepositoryFake(profile),
			createMockChallengeService()
		);

		// Unauthenticated
		const unauthEvent = createFakeEvent(null);
		const unauthResult = await service.getAroundMe(unauthEvent);
		expect(unauthResult).toEqual([]);

		// Authenticated
		const authEvent = createFakeEvent(createFakeUser({ id: profile.id }));
		authEvent.locals.profile = profile;

		const result = await service.getAroundMe(authEvent, { date: today, windowSize: 2 });
		expect(result).toHaveLength(3);
		expect(result[1].isCurrent).toBe(true);
		expect(result[0].isCurrent).toBe(false);
		expect(result[2].isCurrent).toBe(false);
	});

	it('strictly validates limit and offset parameters and rejects malformed values', async () => {
		const service = createDailyLeaderboardService(
			createMockDailyRepo(),
			createProfileRepositoryFake(null),
			createMockChallengeService()
		);
		const event = createFakeEvent(null);

		// Invalid limit < 1
		await expect(service.getLeaderboard(event, { limit: 0 })).rejects.toThrow(
			/limit must be an integer between 1 and 100/
		);

		// Invalid limit > 100
		await expect(service.getLeaderboard(event, { limit: 101 })).rejects.toThrow(
			/limit must be an integer between 1 and 100/
		);

		// Non-integer limit
		await expect(service.getLeaderboard(event, { limit: 10.5 })).rejects.toThrow(
			/limit must be an integer between 1 and 100/
		);

		// Negative offset
		await expect(service.getLeaderboard(event, { offset: -1 })).rejects.toThrow(
			/offset must be a non-negative integer/
		);

		// Non-integer offset
		await expect(service.getLeaderboard(event, { offset: 5.5 })).rejects.toThrow(
			/offset must be a non-negative integer/
		);
	});
});
