import { describe, expect, it } from 'vitest';
import { applyRatingDelta, calculateRatingDelta } from './rating';

describe('rating', () => {
	it.each([
		[100, 40],
		[90, 40],
		[89, 25],
		[80, 25],
		[79, 10],
		[70, 10],
		[69, 0],
		[50, 0],
		[49, -10]
	])('returns rating delta for %i percent accuracy', (accuracy, expected) => {
		expect(calculateRatingDelta(accuracy)).toBe(expected);
	});

	it('does not allow rating below zero', () => {
		expect(applyRatingDelta(5, -10)).toBe(0);
	});
});
