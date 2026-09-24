import { describe, expect, it } from 'vitest';
import { createLeaderboardService } from './leaderboard-service';
import {
	createFakeEvent,
	createFakeUser,
	createProfile,
	createProfileRepositoryFake
} from '$lib/server/test/fakes';
import type { LeaderboardRepository } from '$lib/server/db/repositories/leaderboard-repository';

function createMockLeaderboardRepo(
	overrides: Partial<LeaderboardRepository> = {}
): LeaderboardRepository {
	return {
		listGlobal: async () => [],
		getUserGlobalPosition: async () => null,
		listTier: async () => [],
		getUserTierPosition: async () => null,
		listCategory: async () => [],
		getUserCategoryPosition: async () => null,
		getUserCategoryMastery: async () => null,
		listWeekly: async () => [],
		getUserWeeklyPosition: async () => null,
		getUserWeeklyProgress: async () => null,
		countWeeklyParticipants: async () => 0,
		list: async () => [],
		getUserPosition: async () => null,
		...overrides
	};
}

describe('leaderboard service', () => {
	it('returns global leaderboard entries without email fields', async () => {
		const profile = createProfile();
		const repository = createMockLeaderboardRepo({
			async listGlobal() {
				return [
					{
						userId: 'user-1',
						displayName: 'Player One',
						rank: 'Gold Analyst',
						rating: 1500,
						averageAccuracy: 85.4,
						totalCompleted: 10,
						position: 1
					}
				];
			}
		});

		const service = createLeaderboardService(repository, createProfileRepositoryFake(profile));
		const result = await service.listGlobal(createFakeEvent(createFakeUser({ id: profile.id })), {
			limit: 10,
			offset: 0
		});

		expect(result.items[0]).toEqual({
			userId: 'user-1',
			position: 1,
			displayName: 'Player One',
			rank: 'Gold Analyst',
			logicRating: 1500,
			averageAccuracy: 85.4,
			totalCompleted: 10
		});
		expect(JSON.stringify(result)).not.toContain('@');
	});

	it('returns current user global position correctly', async () => {
		const profile = createProfile({ id: 'user-99' });
		const repository = createMockLeaderboardRepo({
			async getUserGlobalPosition(userId) {
				if (userId !== 'user-99') return null;
				return {
					userId: 'user-99',
					displayName: 'John Doe',
					rank: 'Platinum Strategist',
					rating: 1750,
					averageAccuracy: 92.1,
					totalCompleted: 25,
					position: 4
				};
			}
		});

		const service = createLeaderboardService(repository, createProfileRepositoryFake(profile));
		const result = await service.getCurrentUserGlobalEntry(
			createFakeEvent(createFakeUser({ id: profile.id }))
		);

		expect(result).toEqual({
			userId: 'user-99',
			position: 4,
			displayName: 'John Doe',
			rank: 'Platinum Strategist',
			logicRating: 1750,
			averageAccuracy: 92.1,
			totalCompleted: 25
		});
	});

	it('lists tier leaderboard filtered by rank tier', async () => {
		const profile = createProfile();
		const repository = createMockLeaderboardRepo({
			async listTier({ rank }) {
				expect(rank).toBe('Diamond Reasoner');
				return [
					{
						userId: 'user-diamond',
						displayName: 'Diamond Player',
						rank: 'Diamond Reasoner',
						rating: 2200,
						averageAccuracy: 94.0,
						totalCompleted: 40,
						position: 1
					}
				];
			}
		});

		const service = createLeaderboardService(repository, createProfileRepositoryFake(profile));
		const result = await service.listTier(
			createFakeEvent(createFakeUser({ id: profile.id })),
			'Diamond Reasoner',
			{ limit: 10, offset: 0 }
		);

		expect(result.items).toHaveLength(1);
		expect(result.items[0].rank).toBe('Diamond Reasoner');
		expect(result.items[0].position).toBe(1);
	});

	it('returns category leaderboard with qualified players and metrics', async () => {
		const profile = createProfile();
		const repository = createMockLeaderboardRepo({
			async listCategory({ questionType }) {
				expect(questionType).toBe('number_sequence');
				return [
					{
						userId: 'user-seq-1',
						displayName: 'Sequence Master',
						questionType: 'number_sequence',
						rating: 1850,
						accuracy: 91.5,
						totalQuestions: 45,
						totalSessions: 6,
						position: 1
					}
				];
			}
		});

		const service = createLeaderboardService(repository, createProfileRepositoryFake(profile));
		const result = await service.listCategory(
			createFakeEvent(createFakeUser({ id: profile.id })),
			'number_sequence',
			{ limit: 10, offset: 0 }
		);

		expect(result.items).toHaveLength(1);
		expect(result.items[0]).toEqual({
			userId: 'user-seq-1',
			position: 1,
			displayName: 'Sequence Master',
			questionType: 'number_sequence',
			masteryRating: 1850,
			accuracy: 91.5,
			totalQuestions: 45,
			totalSessions: 6
		});
	});

	it('returns qualified status and entry when user meets category threshold', async () => {
		const profile = createProfile({ id: 'user-qualified' });
		const repository = createMockLeaderboardRepo({
			async getUserCategoryPosition({ userId, questionType }) {
				if (userId === 'user-qualified' && questionType === 'symbol_pattern') {
					return {
						userId: 'user-qualified',
						displayName: 'Qualified User',
						questionType: 'symbol_pattern',
						rating: 1650,
						accuracy: 88.0,
						totalQuestions: 25,
						totalSessions: 4,
						position: 7
					};
				}
				return null;
			}
		});

		const service = createLeaderboardService(repository, createProfileRepositoryFake(profile));
		const result = await service.getCurrentUserCategoryEntry(
			createFakeEvent(createFakeUser({ id: profile.id })),
			'symbol_pattern'
		);

		expect(result.isQualified).toBe(true);
		expect(result.entry?.position).toBe(7);
		expect(result.entry?.masteryRating).toBe(1650);
		expect(result.provisionalProgress).toBeNull();
	});

	it('returns provisional progress when user has not yet qualified in category', async () => {
		const profile = createProfile({ id: 'user-provisional' });
		const repository = createMockLeaderboardRepo({
			async getUserCategoryPosition() {
				// Not qualified, so not in ranked CTE
				return null;
			},
			async getUserCategoryMastery({ userId, questionType }) {
				if (userId === 'user-provisional' && questionType === 'mini_deduction') {
					return {
						rating: 750,
						totalQuestions: 14,
						totalSessions: 2,
						correctAnswers: 11
					};
				}
				return null;
			}
		});

		const service = createLeaderboardService(repository, createProfileRepositoryFake(profile));
		const result = await service.getCurrentUserCategoryEntry(
			createFakeEvent(createFakeUser({ id: profile.id })),
			'mini_deduction'
		);

		expect(result.isQualified).toBe(false);
		expect(result.entry).toBeNull();
		expect(result.provisionalProgress).toEqual({
			totalQuestions: 14,
			totalSessions: 2,
			rating: 750
		});
	});

	it('returns zero provisional progress when user has never played category', async () => {
		const profile = createProfile({ id: 'user-new' });
		const repository = createMockLeaderboardRepo({
			async getUserCategoryPosition() {
				return null;
			},
			async getUserCategoryMastery() {
				return null;
			}
		});

		const service = createLeaderboardService(repository, createProfileRepositoryFake(profile));
		const result = await service.getCurrentUserCategoryEntry(
			createFakeEvent(createFakeUser({ id: profile.id })),
			'memory_pattern'
		);

		expect(result.isQualified).toBe(false);
		expect(result.entry).toBeNull();
		expect(result.provisionalProgress).toEqual({
			totalQuestions: 0,
			totalSessions: 0,
			rating: 400
		});
	});
});
