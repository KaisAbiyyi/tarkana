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
						displayName: 'Visible Name',
						rank: 'Bronze Mind',
						rating: 120,
						averageAccuracy: 88.234,
						totalCompleted: 4
					}
				];
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
			position: 1,
			displayName: 'Visible Name',
			rank: 'Bronze Mind',
			logicRating: 120,
			averageAccuracy: 88.23,
			totalCompleted: 4
		});
		expect(JSON.stringify(result)).not.toContain('@');
	});
});
