import type { PageServerLoad } from './$types';
import { createLeaderboardService } from '$lib/server/leaderboard/leaderboard-service';

export const load: PageServerLoad = async (event) => {
	const limit = 50;
	const offset = Number(event.url.searchParams.get('offset') ?? 0);
	const service = createLeaderboardService();

	return {
		leaderboard: await service.listLeaderboard(event, { limit, offset }),
		currentUserEntry: await service.getCurrentUserEntry(event),
		currentUserId: event.locals.profile?.id
	};
};
