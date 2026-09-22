import type { PageServerLoad } from './$types';
import { createLeaderboardService } from '$lib/server/leaderboard/leaderboard-service';
import { createDailyLeaderboardService } from '$lib/server/leaderboard/daily-leaderboard-service';
import { getUtcDateString } from '$lib/server/challenge/daily-challenge';

export const load: PageServerLoad = async (event) => {
	const tab: 'daily' | 'global' =
		event.url.searchParams.get('tab') === 'global' ? 'global' : 'daily';
	const date = event.url.searchParams.get('date') ?? getUtcDateString();
	const limit = 50;
	const offset = Number(event.url.searchParams.get('offset') ?? 0);

	const dailyLeaderboardService = createDailyLeaderboardService();
	const dailyLeaderboard = await dailyLeaderboardService.getLeaderboard(event, {
		date,
		limit,
		offset
	});

	let globalLeaderboard = null;
	let globalCurrentUserEntry = null;

	if (event.locals.profile) {
		const globalService = createLeaderboardService();
		globalLeaderboard = await globalService.listLeaderboard(event, { limit, offset });
		globalCurrentUserEntry = await globalService.getCurrentUserEntry(event);
	}

	return {
		tab,
		date,
		dailyLeaderboard,
		globalLeaderboard,
		globalCurrentUserEntry,
		currentUserId: event.locals.profile?.id ?? null,
		isGuest: !event.locals.profile
	};
};
