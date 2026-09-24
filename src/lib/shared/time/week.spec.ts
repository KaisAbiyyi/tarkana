import { describe, expect, it } from 'vitest';
import { getUtcWeekBounds } from './week';

describe('UTC ISO Week Utility (getUtcWeekBounds)', () => {
	it('calculates correct Monday 00:00:00 UTC start and next Monday 00:00:00 UTC end for a mid-week date', () => {
		// Thursday, September 24, 2026, 14:30:00 UTC
		const refDate = new Date('2026-09-24T14:30:00.000Z');
		const bounds = getUtcWeekBounds(refDate);

		expect(bounds.startOfWeek.toISOString()).toBe('2026-09-21T00:00:00.000Z');
		expect(bounds.endOfWeek.toISOString()).toBe('2026-09-28T00:00:00.000Z');
		expect(bounds.weekLabel).toBe('2026-W39');
		expect(bounds.secondsUntilReset).toBeGreaterThan(0);
		// Difference should be exact seconds until next Monday 00:00:00 UTC
		const expectedSeconds = Math.floor(
			(new Date('2026-09-28T00:00:00.000Z').getTime() - refDate.getTime()) / 1000
		);
		expect(bounds.secondsUntilReset).toBe(expectedSeconds);
	});

	it('correctly identifies week start on Monday at 00:00:00 UTC', () => {
		const mondayStart = new Date('2026-09-21T00:00:00.000Z');
		const bounds = getUtcWeekBounds(mondayStart);

		expect(bounds.startOfWeek.toISOString()).toBe('2026-09-21T00:00:00.000Z');
		expect(bounds.endOfWeek.toISOString()).toBe('2026-09-28T00:00:00.000Z');
		expect(bounds.weekLabel).toBe('2026-W39');
		expect(bounds.secondsUntilReset).toBe(7 * 86400);
	});

	it('correctly keeps Sunday 23:59:59 UTC within preceding Monday week', () => {
		const sundayEnd = new Date('2026-09-27T23:59:59.000Z');
		const bounds = getUtcWeekBounds(sundayEnd);

		expect(bounds.startOfWeek.toISOString()).toBe('2026-09-21T00:00:00.000Z');
		expect(bounds.endOfWeek.toISOString()).toBe('2026-09-28T00:00:00.000Z');
		expect(bounds.weekLabel).toBe('2026-W39');
		expect(bounds.secondsUntilReset).toBe(1);
	});

	it('advances to new week exactly at Monday 00:00:00 UTC', () => {
		const nextMonday = new Date('2026-09-28T00:00:00.000Z');
		const bounds = getUtcWeekBounds(nextMonday);

		expect(bounds.startOfWeek.toISOString()).toBe('2026-09-28T00:00:00.000Z');
		expect(bounds.endOfWeek.toISOString()).toBe('2026-10-05T00:00:00.000Z');
		expect(bounds.weekLabel).toBe('2026-W40');
		expect(bounds.secondsUntilReset).toBe(7 * 86400);
	});

	it('correctly handles week bounds at calendar year boundary', () => {
		// Dec 31, 2026 is a Thursday
		const endOfYear = new Date('2026-12-31T12:00:00.000Z');
		const bounds = getUtcWeekBounds(endOfYear);

		expect(bounds.startOfWeek.toISOString()).toBe('2026-12-28T00:00:00.000Z');
		expect(bounds.endOfWeek.toISOString()).toBe('2027-01-04T00:00:00.000Z');
		expect(bounds.weekLabel).toBe('2026-W53');
	});
});
