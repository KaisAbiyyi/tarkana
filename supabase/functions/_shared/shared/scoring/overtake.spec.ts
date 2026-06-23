import { describe, expect, it } from 'vitest';
import { calculateOvertakeTarget } from './overtake.ts';

describe('calculateOvertakeTarget', () => {
	it('requires exactly +1 rating when both have equal completed rounds', () => {
		const result = calculateOvertakeTarget(
			{ logicRating: 100, totalCompleted: 10 },
			{ logicRating: 120, totalCompleted: 10 }
		);
		expect(result.targetRating).toBe(121);
		expect(result.gap).toBe(21);
	});

	it('requires exactly +1 rating when current has fewer completed rounds', () => {
		const result = calculateOvertakeTarget(
			{ logicRating: 100, totalCompleted: 9 },
			{ logicRating: 120, totalCompleted: 10 }
		);
		expect(result.targetRating).toBe(121);
		expect(result.gap).toBe(21);
	});

	it('allows matching the target rating when current has more completed rounds (tie-break win)', () => {
		const result = calculateOvertakeTarget(
			{ logicRating: 100, totalCompleted: 11 },
			{ logicRating: 120, totalCompleted: 10 }
		);
		expect(result.targetRating).toBe(120);
		expect(result.gap).toBe(20);
	});

	it('returns a gap of 0 when current rating already exceeds the target rating', () => {
		const result = calculateOvertakeTarget(
			{ logicRating: 150, totalCompleted: 5 },
			{ logicRating: 120, totalCompleted: 10 }
		);
		expect(result.targetRating).toBe(121);
		expect(result.gap).toBe(0);
	});

	it('handles equal ratings where current has fewer rounds (needs to overtake by rating)', () => {
		const result = calculateOvertakeTarget(
			{ logicRating: 120, totalCompleted: 5 },
			{ logicRating: 120, totalCompleted: 10 }
		);
		// Target is 120 but has more rounds, so current needs 121
		expect(result.targetRating).toBe(121);
		expect(result.gap).toBe(1);
	});
});
