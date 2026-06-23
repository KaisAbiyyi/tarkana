import { describe, expect, it } from 'vitest';
import { expandDifficultyPlan, resolveDifficultyDistribution } from './difficulty-resolver';

describe('difficulty resolver', () => {
	it.each([
		[0, { easy: 30, medium: 60, hard: 10 }],
		[499, { easy: 30, medium: 60, hard: 10 }],
		[500, { easy: 40, medium: 50, hard: 10 }],
		[999, { easy: 40, medium: 50, hard: 10 }],
		[1000, { easy: 20, medium: 60, hard: 20 }],
		[1499, { easy: 20, medium: 60, hard: 20 }],
		[1500, { easy: 10, medium: 50, hard: 40 }],
		[1999, { easy: 10, medium: 50, hard: 40 }],
		[2000, { easy: 0, medium: 40, hard: 60 }]
	])('resolves rating %i distribution', (rating, expected) => {
		expect(resolveDifficultyDistribution(rating)).toEqual(expected);
	});

	it('expands percentage distribution to a concrete question plan', () => {
		expect(
			expandDifficultyPlan({ questionCount: 10, distribution: { easy: 40, medium: 50, hard: 10 } })
		).toEqual([
			'easy',
			'easy',
			'easy',
			'easy',
			'medium',
			'medium',
			'medium',
			'medium',
			'medium',
			'hard'
		]);
	});
});
