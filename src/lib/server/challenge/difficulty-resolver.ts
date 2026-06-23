import type { DifficultyBand } from '$lib/shared/constants/challenge';
import type { DifficultyDistribution } from '$lib/server/challenge/types';

export const DEFAULT_DIFFICULTY_DISTRIBUTIONS: readonly {
	minRating: number;
	maxRating: number | null;
	distribution: DifficultyDistribution;
}[] = [
	{ minRating: 0, maxRating: 499, distribution: { easy: 30, medium: 60, hard: 10 } },
	{ minRating: 500, maxRating: 999, distribution: { easy: 40, medium: 50, hard: 10 } },
	{ minRating: 1000, maxRating: 1499, distribution: { easy: 20, medium: 60, hard: 20 } },
	{ minRating: 1500, maxRating: 1999, distribution: { easy: 10, medium: 50, hard: 40 } },
	{ minRating: 2000, maxRating: null, distribution: { easy: 0, medium: 40, hard: 60 } }
] as const;

export function resolveDifficultyDistribution(userRating: number): DifficultyDistribution {
	const rating = Math.max(0, Math.floor(userRating));
	const match = DEFAULT_DIFFICULTY_DISTRIBUTIONS.find(
		(band) => rating >= band.minRating && (band.maxRating === null || rating <= band.maxRating)
	);

	return { ...(match?.distribution ?? DEFAULT_DIFFICULTY_DISTRIBUTIONS[0].distribution) };
}

export function expandDifficultyPlan(input: {
	questionCount: number;
	distribution: DifficultyDistribution;
}): DifficultyBand[] {
	if (!Number.isInteger(input.questionCount) || input.questionCount <= 0) {
		throw new Error('questionCount must be positive');
	}

	const weighted = Object.entries(input.distribution)
		.filter(([, weight]) => weight > 0)
		.map(([difficulty, weight]) => ({
			difficulty: difficulty as DifficultyBand,
			exactCount: (input.questionCount * weight) / 100
		}));

	if (weighted.length === 0) throw new Error('At least one difficulty weight is required');

	const floors = weighted.map((item) => ({
		difficulty: item.difficulty,
		count: Math.floor(item.exactCount),
		remainder: item.exactCount - Math.floor(item.exactCount)
	}));
	let assigned = floors.reduce((sum, item) => sum + item.count, 0);

	for (const item of [...floors].sort((left, right) => right.remainder - left.remainder)) {
		if (assigned >= input.questionCount) break;
		item.count += 1;
		assigned += 1;
	}

	return floors.flatMap((item) => Array<DifficultyBand>(item.count).fill(item.difficulty));
}

export function resolveDifficultyScore(input: {
	difficulty: DifficultyBand;
	min?: number;
	max?: number;
	offset?: number;
}): number {
	const defaultRange = getDifficultyScoreRange(input.difficulty);
	const min = Number.isFinite(input.min) ? (input.min as number) : defaultRange.min;
	const max = Number.isFinite(input.max) ? (input.max as number) : defaultRange.max;
	const safeMin = Math.max(1, min);
	const safeMax = Math.max(safeMin, max);
	const width = safeMax - safeMin + 1;
	return safeMin + ((input.offset ?? 0) % width);
}

export function getDifficultyScoreRange(difficulty: DifficultyBand): { min: number; max: number } {
	switch (difficulty) {
		case 'easy':
			return { min: 100, max: 180 };
		case 'medium':
			return { min: 200, max: 320 };
		case 'hard':
			return { min: 350, max: 520 };
	}
}
