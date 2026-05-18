import { describe, expect, it } from 'vitest';
import {
	calculateAccuracyBonus,
	calculateQuestionScore,
	calculateSessionScore,
	calculateStreakBonus,
	getTimeMultiplier
} from './scoring';

describe('scoring', () => {
	it.each([
		[5, 20, 1.5],
		[10, 20, 1.3],
		[15, 20, 1.1],
		[19, 20, 1],
		[20, 20, 0]
	])(
		'returns time multiplier for %i/%i seconds',
		(timeSpentSeconds, timeLimitSeconds, expected) => {
			expect(getTimeMultiplier({ timeSpentSeconds, timeLimitSeconds })).toBe(expected);
		}
	);

	it('scores correct answers and gives zero for wrong or expired answers', () => {
		expect(
			calculateQuestionScore({
				isCorrect: true,
				difficultyScore: 100,
				timeSpentSeconds: 5,
				timeLimitSeconds: 20
			})
		).toBe(150);
		expect(
			calculateQuestionScore({
				isCorrect: false,
				difficultyScore: 100,
				timeSpentSeconds: 5,
				timeLimitSeconds: 20
			})
		).toBe(0);
		expect(
			calculateQuestionScore({
				isCorrect: true,
				difficultyScore: 100,
				timeSpentSeconds: 20,
				timeLimitSeconds: 20
			})
		).toBe(0);
	});

	it.each([
		[100, 150],
		[90, 100],
		[80, 60],
		[70, 30],
		[69, 0]
	])('returns accuracy bonus for %i percent', (accuracy, expected) => {
		expect(calculateAccuracyBonus(accuracy)).toBe(expected);
	});

	it('adds streak bonuses once at thresholds', () => {
		expect(calculateStreakBonus([true, true, true, true, true, false, true])).toBe(70);
		expect(calculateStreakBonus(Array(10).fill(true))).toBe(190);
	});

	it('calculates session totals', () => {
		const summary = calculateSessionScore([
			{ isCorrect: true, difficultyScore: 100, timeSpentSeconds: 5, timeLimitSeconds: 20 },
			{ isCorrect: false, difficultyScore: 100, timeSpentSeconds: 5, timeLimitSeconds: 20 }
		]);

		expect(summary).toMatchObject({
			totalQuestionScore: 150,
			accuracy: 50,
			totalScore: 150,
			averageTimeSeconds: 5
		});
	});
});
