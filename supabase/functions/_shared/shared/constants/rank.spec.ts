import { describe, it, expect } from 'vitest';
import { calculateRankProgress, resolveRankName, UNRANKED } from './rank.ts';

describe('rank constants and logic', () => {
	describe('calculateRankProgress', () => {
		it('returns null for Unranked', () => {
			expect(calculateRankProgress(100, UNRANKED)).toBeNull();
		});

		it('calculates progress at exact tier minimum', () => {
			// Bronze Mind is 0 - 499, next is Silver Solver 500
			const result = calculateRankProgress(0, 'Bronze Mind');
			expect(result).not.toBeNull();
			expect(result?.percentage).toBe(0);
			expect(result?.remaining).toBe(500);
			expect(result?.nextRankName).toBe('Silver Solver');
		});

		it('calculates progress in the middle of a tier', () => {
			// Bronze Mind is 0 - 499, next is Silver Solver 500
			// Progress = (250 - 0) / (500 - 0) = 50%
			const result = calculateRankProgress(250, 'Bronze Mind');
			expect(result).not.toBeNull();
			expect(result?.percentage).toBe(50);
			expect(result?.remaining).toBe(250);
		});

		it('calculates progress one point before promotion', () => {
			// Bronze Mind is 0 - 499, next is Silver Solver 500
			// Progress = (499 - 0) / (500 - 0) = 99.8%
			const result = calculateRankProgress(499, 'Bronze Mind');
			expect(result).not.toBeNull();
			expect(result?.percentage).toBe(99.8);
			expect(result?.remaining).toBe(1);
		});

		it('calculates progress at exact promotion threshold if temporarily unpromoted', () => {
			// e.g. rating 500 but somehow still labeled Bronze Mind
			const result = calculateRankProgress(500, 'Bronze Mind');
			expect(result).not.toBeNull();
			expect(result?.percentage).toBe(100);
			expect(result?.remaining).toBe(0);
		});

		it('returns null for the highest tier (Mastermind)', () => {
			const result = calculateRankProgress(2500, 'Mastermind');
			expect(result).toBeNull();
		});

		it('handles missing threshold data gracefully', () => {
			// If we pass an invalid rank, it returns null
			// @ts-expect-error Testing invalid input
			const result = calculateRankProgress(1000, 'InvalidRankName');
			expect(result).toBeNull();
		});
	});

	describe('resolveRankName', () => {
		it('returns Unranked if completedChallenges <= 0', () => {
			expect(resolveRankName(500, 0)).toBe(UNRANKED);
		});

		it('returns Bronze Mind for rating 0', () => {
			expect(resolveRankName(0, 1)).toBe('Bronze Mind');
		});

		it('returns Silver Solver for rating 500', () => {
			expect(resolveRankName(500, 1)).toBe('Silver Solver');
		});
	});
});
