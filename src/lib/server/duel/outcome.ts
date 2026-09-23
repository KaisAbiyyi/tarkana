export type DuelOutcome = 'win' | 'loss' | 'draw';

export interface DuelContenderStats {
	score: number;
	accuracy: number;
	totalTimeSeconds: number;
	isSuspicious?: boolean;
}

/**
 * Resolves the outcome of a participant against the creator.
 * Winner contract: score DESC → accuracy DESC → totalTimeSeconds ASC; exact tie = draw.
 * Suspicious participant attempts are invalid and cannot win.
 */
export function resolveDuelOutcome(
	participant: DuelContenderStats,
	creator: DuelContenderStats
): DuelOutcome {
	if (participant.isSuspicious) {
		return 'loss';
	}

	if (participant.score > creator.score) return 'win';
	if (participant.score < creator.score) return 'loss';

	if (participant.accuracy > creator.accuracy) return 'win';
	if (participant.accuracy < creator.accuracy) return 'loss';

	if (participant.totalTimeSeconds < creator.totalTimeSeconds) return 'win';
	if (participant.totalTimeSeconds > creator.totalTimeSeconds) return 'loss';

	return 'draw';
}

/**
 * Compares two contenders for sorting standings.
 * Returns negative if a ranks higher than b, positive if b ranks higher than a.
 */
export function compareContenders(a: DuelContenderStats, b: DuelContenderStats): number {
	if (a.isSuspicious && !b.isSuspicious) return 1;
	if (!a.isSuspicious && b.isSuspicious) return -1;

	if (b.score !== a.score) return b.score - a.score;
	if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
	return a.totalTimeSeconds - b.totalTimeSeconds;
}
