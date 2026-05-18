import { RANK_DEFINITIONS, type RankName, resolveRankName } from '$lib/shared/constants/rank';

export function resolveCompletedRank(rating: number): RankName {
	return resolveRankName(rating, 1);
}

export function isRankPromotion(before: RankName, after: RankName): boolean {
	return getRankOrder(after) > getRankOrder(before);
}

export function getRankProgress(rating: number): {
	currentRank: RankName;
	nextRank: RankName | null;
	progressPercent: number;
	pointsToNextRank: number | null;
} {
	const currentRank = resolveCompletedRank(rating);
	const currentDefinition = RANK_DEFINITIONS.find((rank) => rank.name === currentRank);
	const nextDefinition = RANK_DEFINITIONS.find((rank) => rank.minRating > Math.max(0, rating));

	if (!currentDefinition || !nextDefinition) {
		return {
			currentRank,
			nextRank: null,
			progressPercent: 100,
			pointsToNextRank: null
		};
	}

	const rangeSize = nextDefinition.minRating - currentDefinition.minRating;
	const progress = Math.max(0, Math.min(1, (rating - currentDefinition.minRating) / rangeSize));

	return {
		currentRank,
		nextRank: nextDefinition.name,
		progressPercent: Math.round(progress * 10000) / 100,
		pointsToNextRank: Math.max(0, nextDefinition.minRating - rating)
	};
}

function getRankOrder(rankName: RankName): number {
	if (rankName === 'Unranked') return 0;
	return RANK_DEFINITIONS.findIndex((rank) => rank.name === rankName) + 1;
}
