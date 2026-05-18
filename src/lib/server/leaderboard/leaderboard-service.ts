import type { RequestEvent } from '@sveltejs/kit';
import type { LeaderboardEntryDto } from '$lib/shared/types/leaderboard';
import type { PaginatedResult, PaginationInput } from '$lib/shared/types/session';
import { requireProfile } from '$lib/server/auth/guards';
import {
	createLeaderboardRepository,
	type LeaderboardRepository
} from '$lib/server/db/repositories/leaderboard-repository';
import type { ProfileRepository } from '$lib/server/db/repositories/profile-repository';

export type LeaderboardService = {
	listLeaderboard(
		event: RequestEvent,
		pagination: PaginationInput
	): Promise<PaginatedResult<LeaderboardEntryDto>>;
};

export function createLeaderboardService(
	leaderboardRepository: LeaderboardRepository = createLeaderboardRepository(),
	profileRepository?: ProfileRepository
): LeaderboardService {
	return {
		async listLeaderboard(event, pagination) {
			await requireProfile(event, profileRepository);
			const rows = await leaderboardRepository.list(pagination);

			return {
				items: rows.map((row, index) => ({
					position: pagination.offset + index + 1,
					displayName: row.displayName,
					rank: row.rank,
					logicRating: row.rating,
					averageAccuracy: Math.round(Number(row.averageAccuracy) * 100) / 100,
					totalCompleted: row.totalCompleted
				})),
				limit: pagination.limit,
				offset: pagination.offset,
				total: null
			};
		}
	};
}
