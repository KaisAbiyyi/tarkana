import { describe, expect, it } from 'vitest';
import { expandDifficultyPlan, resolveDifficultyDistribution } from './difficulty-resolver';

describe('difficulty resolver', () => {
	it.each([
		[0, { easy: 50, medium: 40, hard: 10 }],
		[499, { easy: 50, medium: 40, hard: 10 }],
		[500, { easy: 35, medium: 50, hard: 15 }],
		[999, { easy: 35, medium: 50, hard: 15 }],
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

	describe('Monotonicity Property Tests', () => {
		it('proves difficulty distributions are strictly monotonic across rating tiers', () => {
			const ratings = [0, 250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2500, 3000];
			let prevEasy = 100;
			let prevHard = 0;
			let prevMean = 0;

			for (const r of ratings) {
				const dist = resolveDifficultyDistribution(r);
				const sum = dist.easy + dist.medium + dist.hard;
				expect(sum).toBe(100);

				// Easy percentage is monotonically non-increasing
				expect(dist.easy).toBeLessThanOrEqual(prevEasy);

				// Hard percentage is monotonically non-decreasing
				expect(dist.hard).toBeGreaterThanOrEqual(prevHard);

				// Weighted mean difficulty is monotonically increasing
				const mean = (dist.easy * 1 + dist.medium * 2 + dist.hard * 3) / 100;
				expect(mean).toBeGreaterThanOrEqual(prevMean);

				prevEasy = dist.easy;
				prevHard = dist.hard;
				prevMean = mean;
			}
		});

		it('proves strictly increasing mean difficulty between distinct tiers', () => {
			const tiers = [
				{ name: 'Bronze', rating: 400 },
				{ name: 'Silver', rating: 800 },
				{ name: 'Gold', rating: 1200 },
				{ name: 'Platinum', rating: 1600 },
				{ name: 'Diamond', rating: 2200 }
			];

			const means = tiers.map((t) => {
				const dist = resolveDifficultyDistribution(t.rating);
				return (dist.easy * 1 + dist.medium * 2 + dist.hard * 3) / 100;
			});

			for (let i = 1; i < means.length; i++) {
				expect(means[i]).toBeGreaterThan(means[i - 1]!);
			}
		});
	});
});
