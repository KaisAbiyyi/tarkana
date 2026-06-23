export type LeaderboardCompetitor = {
	logicRating: number;
	totalCompleted: number;
};

export type OvertakeTarget = {
	targetRating: number;
	gap: number;
};

/**
 * Calculates the logic rating needed for the current player to overtake the target player.
 * The authoritative ranking sorts by:
 * 1. logicRating DESC
 * 2. totalCompleted DESC
 *
 * Therefore, to overtake someone, you must either:
 * - Have a strictly higher logicRating
 * - Have the SAME logicRating, but a strictly higher totalCompleted count
 */
export function calculateOvertakeTarget(
	current: LeaderboardCompetitor,
	target: LeaderboardCompetitor
): OvertakeTarget {
	// If current has strictly more rounds completed, matching the rating is enough to win the tie-break
	// If current has equal or fewer rounds, they lose the tie-break and need strictly greater rating
	const needsStrictlyGreaterRating = current.totalCompleted <= target.totalCompleted;

	const targetRating = target.logicRating + (needsStrictlyGreaterRating ? 1 : 0);
	const gap = Math.max(0, targetRating - current.logicRating);

	return { targetRating, gap };
}
