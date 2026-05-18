import type { PageServerLoad } from './$types';
import { createLeaderboardService } from '$lib/server/leaderboard/leaderboard-service';

export const load: PageServerLoad = async (event) => {
	const limit = 50;
	const offset = Number(event.url.searchParams.get('offset') ?? 0);

	return {
		leaderboard: await createLeaderboardService().listLeaderboard(event, { limit, offset })
	};
};
