import type { PageServerLoad } from './$types';
import { createLeaderboardService } from '$lib/server/leaderboard/leaderboard-service';
import { createDailyLeaderboardService } from '$lib/server/leaderboard/daily-leaderboard-service';
import { getUtcDateString } from '$lib/server/challenge/daily-challenge';
import { QUESTION_TYPES, type QuestionType } from '$lib/shared/constants/challenge';
import { RANK_NAMES, type RankedTier } from '$lib/shared/constants/rank';
import type { LeaderboardTab } from '$lib/shared/types/leaderboard';

export const load: PageServerLoad = async (event) => {
	const tabRaw = event.url.searchParams.get('tab');
	const tab: LeaderboardTab =
		tabRaw === 'global' || tabRaw === 'tier' || tabRaw === 'category' ? tabRaw : 'daily';

	const date = event.url.searchParams.get('date') ?? getUtcDateString();
	const limit = 50;
	const offsetRaw = event.url.searchParams.get('offset');
	const parsedOffset = offsetRaw ? parseInt(offsetRaw, 10) : 0;
	const offset = Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

	const dailyLeaderboardService = createDailyLeaderboardService();
	const dailyLeaderboard = await dailyLeaderboardService.getLeaderboard(event, {
		date,
		limit,
		offset
	});

	const userRank = event.locals.profile?.rank;
	const defaultTier: RankedTier =
		userRank && userRank !== 'Unranked' && RANK_NAMES.includes(userRank)
			? (userRank as RankedTier)
			: 'Bronze Mind';
	const tierParam = event.url.searchParams.get('tier');
	const selectedTier: RankedTier =
		tierParam && tierParam !== 'Unranked' && (RANK_NAMES as readonly string[]).includes(tierParam)
			? (tierParam as RankedTier)
			: defaultTier;

	const categoryParam = event.url.searchParams.get('category') as QuestionType;
	const selectedCategory: QuestionType =
		categoryParam && QUESTION_TYPES.includes(categoryParam) ? categoryParam : 'number_sequence';

	let globalLeaderboard = null;
	let globalCurrentUserEntry = null;
	let tierLeaderboard = null;
	let tierCurrentUserEntry = null;
	let categoryLeaderboard = null;
	let categoryCurrentUserEntry = null;

	if (event.locals.profile) {
		const leaderboardService = createLeaderboardService();
		if (tab === 'global') {
			globalLeaderboard = await leaderboardService.listGlobal(event, { limit, offset });
			globalCurrentUserEntry = await leaderboardService.getCurrentUserGlobalEntry(event);
		} else if (tab === 'tier') {
			tierLeaderboard = await leaderboardService.listTier(event, selectedTier, { limit, offset });
			tierCurrentUserEntry = await leaderboardService.getCurrentUserTierEntry(event, selectedTier);
		} else if (tab === 'category') {
			categoryLeaderboard = await leaderboardService.listCategory(event, selectedCategory, {
				limit,
				offset
			});
			categoryCurrentUserEntry = await leaderboardService.getCurrentUserCategoryEntry(
				event,
				selectedCategory
			);
		}
	}

	return {
		tab,
		date,
		selectedTier,
		selectedCategory,
		dailyLeaderboard,
		globalLeaderboard,
		globalCurrentUserEntry,
		tierLeaderboard,
		tierCurrentUserEntry,
		categoryLeaderboard,
		categoryCurrentUserEntry,
		currentUserId: event.locals.profile?.id ?? null,
		currentUserRank: event.locals.profile?.rank ?? 'Unranked',
		isGuest: !event.locals.profile
	};
};
