import { describe, expect, it } from 'vitest';
import { createLeaderboardService } from './leaderboard-service';
import {
	createFakeEvent,
	createFakeUser,
	createProfile,
	createProfileRepositoryFake
} from '$lib/server/test/fakes';
import type { LeaderboardRepository } from '$lib/server/db/repositories/leaderboard-repository';

describe('leaderboard service', () => {
	it('returns leaderboard entries without email fields', async () => {
		const profile = createProfile();
		const repository: LeaderboardRepository = {
			async list() {
				return [
					{
						userId: 'user-1',
						displayName: 'Player One',
						publicDiscriminator: '1234',
						rank: 'Gold Analyst',
						rating: 1500,
						averageAccuracy: 0.854,
						totalCompleted: 10
					}
				];
			},
			async getUserPosition() {
				return null;
			}
		};

		const service = createLeaderboardService(repository, createProfileRepositoryFake(profile));
		const result = await service.listLeaderboard(
			createFakeEvent(createFakeUser({ id: profile.id })),
			{
				limit: 10,
				offset: 0
			}
		);

		expect(result.items[0]).toEqual({
			userId: 'user-1',
			position: 1,
			displayName: 'Player One',
			publicDiscriminator: '1234',
			rank: 'Gold Analyst',
			logicRating: 1500,
			averageAccuracy: 0.85,
			totalCompleted: 10
		});
		expect(JSON.stringify(result)).not.toContain('@');
	});
});
