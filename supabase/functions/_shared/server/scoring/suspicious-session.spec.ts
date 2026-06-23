import { describe, expect, it } from 'vitest';
import { detectSuspiciousSession } from './suspicious-session.ts';

describe('suspicious session detection', () => {
	it('flags invalid timing and request anomalies', () => {
		const result = detectSuspiciousSession({
			answers: [
				{ orderIndex: 0, timeSpentSeconds: -1, timeLimitSeconds: 20 },
				{ orderIndex: 1, timeSpentSeconds: 0.1, timeLimitSeconds: 20 },
				{ orderIndex: 2, timeSpentSeconds: 25, timeLimitSeconds: 20, alreadyAnswered: true }
			],
			requestAnomalyFlags: ['user_mismatch']
		});

		expect(result.reasons).toEqual(
			expect.arrayContaining([
				'negative_time',
				'impossible_response_time',
				'time_limit_exceeded',
				'duplicate_answer',
				'request_user_mismatch'
			])
		);
	});

	it('flags out of order answers in ranked mode', () => {
		expect(
			detectSuspiciousSession({
				answers: [{ orderIndex: 1, timeSpentSeconds: 2, timeLimitSeconds: 20 }]
			}).reasons
		).toContain('out_of_order_answer');
	});
});
