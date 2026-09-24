import type { RequestHandler } from './$types';
import { jsonError, jsonOk } from '$lib/server/api/response';
import { parsePagination } from '$lib/shared/validation/common';
import { createLeaderboardService } from '$lib/server/leaderboard/leaderboard-service';
import { QUESTION_TYPES, type QuestionType } from '$lib/shared/constants/challenge';
import { RANK_NAMES, type RankedTier } from '$lib/shared/constants/rank';

export const GET: RequestHandler = async (event) => {
	try {
		const leaderboardService = createLeaderboardService();
		const pagination = parsePagination(event.url.searchParams);
		const scope = event.url.searchParams.get('scope') ?? 'global';

		if (scope === 'tier') {
			const rankParam = event.url.searchParams.get('rank');
			if (
				!rankParam ||
				rankParam === 'Unranked' ||
				!(RANK_NAMES as readonly string[]).includes(rankParam)
			) {
				return jsonOk({
					items: [],
					limit: pagination.limit,
					offset: pagination.offset,
					total: 0
				});
			}
			return jsonOk(await leaderboardService.listTier(event, rankParam as RankedTier, pagination));
		}

		if (scope === 'category') {
			const categoryParam = event.url.searchParams.get('category') as QuestionType;
			if (!categoryParam || !QUESTION_TYPES.includes(categoryParam)) {
				return jsonOk({
					items: [],
					limit: pagination.limit,
					offset: pagination.offset,
					total: 0
				});
			}
			return jsonOk(await leaderboardService.listCategory(event, categoryParam, pagination));
		}

		if (scope === 'weekly') {
			return jsonOk(await leaderboardService.listWeekly(event, pagination));
		}

		return jsonOk(await leaderboardService.listGlobal(event, pagination));
	} catch (error) {
		return jsonError(error, event.locals.locale);
	}
};
