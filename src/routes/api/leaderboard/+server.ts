import type { RequestHandler } from './$types';
import { jsonError, jsonOk } from '$lib/server/api/response';
import { parsePagination } from '$lib/shared/validation/common';
import { createLeaderboardService } from '$lib/server/leaderboard/leaderboard-service';

export const GET: RequestHandler = async (event) => {
	try {
		const leaderboardService = createLeaderboardService();
		return jsonOk(
			await leaderboardService.listLeaderboard(event, parsePagination(event.url.searchParams))
		);
	} catch (error) {
		return jsonError(error, event.locals.locale);
	}
};
