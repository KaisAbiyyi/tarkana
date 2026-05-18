export const RANK_NAMES = [
	'Unranked',
	'Bronze Mind',
	'Silver Solver',
	'Gold Analyst',
	'Platinum Strategist',
	'Diamond Reasoner',
	'Mastermind'
] as const;

export type RankName = (typeof RANK_NAMES)[number];

export type RankedTier = Exclude<RankName, 'Unranked'>;

export type RankDefinition = {
	name: RankedTier;
	minRating: number;
	maxRating: number | null;
};

export const UNRANKED: RankName = 'Unranked';

export const RANK_DEFINITIONS: readonly RankDefinition[] = [
	{ name: 'Bronze Mind', minRating: 0, maxRating: 499 },
	{ name: 'Silver Solver', minRating: 500, maxRating: 999 },
	{ name: 'Gold Analyst', minRating: 1000, maxRating: 1499 },
	{ name: 'Platinum Strategist', minRating: 1500, maxRating: 1999 },
	{ name: 'Diamond Reasoner', minRating: 2000, maxRating: 2499 },
	{ name: 'Mastermind', minRating: 2500, maxRating: null }
] as const;

export function resolveRankName(rating: number, completedChallenges: number): RankName {
	if (completedChallenges <= 0) return UNRANKED;

	const safeRating = Math.max(0, Math.floor(rating));
	const match = RANK_DEFINITIONS.find(
		(rank) =>
			safeRating >= rank.minRating && (rank.maxRating === null || safeRating <= rank.maxRating)
	);

	return match?.name ?? 'Mastermind';
}
