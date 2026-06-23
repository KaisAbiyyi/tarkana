import { describe, expect, it } from 'vitest';
import { getRoundConfiguration, ROUND_SESSION_OPTIONS } from './round-preparation.ts';

describe('round preparation', () => {
	it('keeps session metadata and challenge payload synchronized', () => {
		expect(
			ROUND_SESSION_OPTIONS.map(({ id, questionCount, estimatedMinutes }) => ({
				id,
				questionCount,
				estimatedMinutes
			}))
		).toEqual([
			{ id: 'quick', questionCount: 5, estimatedMinutes: 1 },
			{ id: 'standard', questionCount: 10, estimatedMinutes: 2 },
			{ id: 'long', questionCount: 20, estimatedMinutes: 4 }
		]);
		expect(getRoundConfiguration('long', 'number_sequence')?.startPayload).toEqual({
			challengeType: 'long',
			selectedMode: 'number_sequence'
		});
		expect(getRoundConfiguration('quick', 'mixed')?.startPayload).toEqual({
			challengeType: 'quick'
		});
	});
});
