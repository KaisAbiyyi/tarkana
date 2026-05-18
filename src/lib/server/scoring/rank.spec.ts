import { describe, expect, it } from 'vitest';
import { getRankProgress, isRankPromotion, resolveCompletedRank } from './rank';

describe('rank', () => {
	it.each([
		[0, 'Bronze Mind'],
		[499, 'Bronze Mind'],
		[500, 'Silver Solver'],
		[999, 'Silver Solver'],
		[1000, 'Gold Analyst'],
		[1499, 'Gold Analyst'],
		[1500, 'Platinum Strategist'],
		[1999, 'Platinum Strategist'],
		[2000, 'Diamond Reasoner'],
		[2499, 'Diamond Reasoner'],
		[2500, 'Mastermind']
	])('resolves %i rating rank', (rating, expected) => {
		expect(resolveCompletedRank(rating)).toBe(expected);
	});

	it('detects promotions only when rank tier increases', () => {
		expect(isRankPromotion('Bronze Mind', 'Silver Solver')).toBe(true);
		expect(isRankPromotion('Gold Analyst', 'Silver Solver')).toBe(false);
	});

	it('returns progress toward the next rank', () => {
		expect(getRankProgress(750)).toMatchObject({
			currentRank: 'Silver Solver',
			nextRank: 'Gold Analyst',
			pointsToNextRank: 250
		});
	});
});
