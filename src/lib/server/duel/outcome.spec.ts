import { describe, expect, it } from 'vitest';
import { resolveDuelOutcome, compareContenders } from './outcome';

describe('Duel Outcome & Winner Contract', () => {
	const creator = {
		score: 850,
		accuracy: 90,
		totalTimeSeconds: 42
	};

	it('returns win when participant has higher score', () => {
		const participant = { score: 900, accuracy: 80, totalTimeSeconds: 50 };
		expect(resolveDuelOutcome(participant, creator)).toBe('win');
	});

	it('returns loss when participant has lower score', () => {
		const participant = { score: 800, accuracy: 100, totalTimeSeconds: 20 };
		expect(resolveDuelOutcome(participant, creator)).toBe('loss');
	});

	it('breaks score ties with accuracy DESC', () => {
		const winByAccuracy = { score: 850, accuracy: 95, totalTimeSeconds: 50 };
		const lossByAccuracy = { score: 850, accuracy: 85, totalTimeSeconds: 30 };

		expect(resolveDuelOutcome(winByAccuracy, creator)).toBe('win');
		expect(resolveDuelOutcome(lossByAccuracy, creator)).toBe('loss');
	});

	it('breaks score and accuracy ties with totalTimeSeconds ASC', () => {
		const winByTime = { score: 850, accuracy: 90, totalTimeSeconds: 40 };
		const lossByTime = { score: 850, accuracy: 90, totalTimeSeconds: 45 };

		expect(resolveDuelOutcome(winByTime, creator)).toBe('win');
		expect(resolveDuelOutcome(lossByTime, creator)).toBe('loss');
	});

	it('returns draw on exact match across score, accuracy, and time', () => {
		const exactTie = { score: 850, accuracy: 90, totalTimeSeconds: 42 };
		expect(resolveDuelOutcome(exactTie, creator)).toBe('draw');
	});

	it('treats suspicious participant as loss regardless of performance', () => {
		const suspiciousHigherScore = {
			score: 1000,
			accuracy: 100,
			totalTimeSeconds: 10,
			isSuspicious: true
		};
		expect(resolveDuelOutcome(suspiciousHigherScore, creator)).toBe('loss');
	});

	it('sorts contenders correctly with compareContenders', () => {
		const contenders = [
			{ id: 'c', score: 850, accuracy: 90, totalTimeSeconds: 45 },
			{ id: 'a', score: 900, accuracy: 80, totalTimeSeconds: 50 },
			{ id: 'b', score: 850, accuracy: 95, totalTimeSeconds: 40 },
			{ id: 'd', score: 850, accuracy: 90, totalTimeSeconds: 40 },
			{ id: 'suspicious', score: 999, accuracy: 100, totalTimeSeconds: 5, isSuspicious: true }
		];

		contenders.sort(compareContenders);

		expect(contenders.map((c) => c.id)).toEqual(['a', 'b', 'd', 'c', 'suspicious']);
	});
});
