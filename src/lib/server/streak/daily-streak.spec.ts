import { describe, expect, it } from 'vitest';
import {
	DAILY_STREAK_MAX_FREEZES,
	DAILY_STREAK_RULES_VERSION,
	evaluateDailyStreak,
	foldDailyStreak,
	resolveDailyStreakTransition,
	resolveNextMilestone,
	toUtcDayNumber
} from './daily-streak';

/** Returns `count` consecutive UTC dates starting at `start`. */
function run(start: string, count: number): string[] {
	const first = toUtcDayNumber(start);
	return Array.from({ length: count }, (_, i) =>
		new Date((first + i) * 86_400_000).toISOString().slice(0, 10)
	);
}

describe('daily streak engine', () => {
	describe('toUtcDayNumber', () => {
		it('rejects malformed and impossible dates', () => {
			expect(() => toUtcDayNumber('2026-11-5')).toThrow();
			expect(() => toUtcDayNumber('2026-02-30')).toThrow();
			expect(() => toUtcDayNumber('2026-11-20T00:00:00Z')).toThrow();
		});

		it('handles month, year and leap-day boundaries as consecutive days', () => {
			expect(toUtcDayNumber('2026-12-01') - toUtcDayNumber('2026-11-30')).toBe(1);
			expect(toUtcDayNumber('2027-01-01') - toUtcDayNumber('2026-12-31')).toBe(1);
			expect(toUtcDayNumber('2028-03-01') - toUtcDayNumber('2028-02-29')).toBe(1);
		});
	});

	describe('foldDailyStreak', () => {
		it('returns an empty ledger for no history', () => {
			expect(foldDailyStreak([])).toEqual({
				currentStreak: 0,
				longestStreak: 0,
				freezesAvailable: 0,
				freezesUsedTotal: 0,
				lastCompletedDate: null
			});
		});

		it('counts consecutive days and is order and duplicate insensitive', () => {
			const dates = run('2026-11-01', 5);
			const shuffled = [dates[3], dates[0], dates[4], dates[1], dates[2], dates[2]];
			const ledger = foldDailyStreak(shuffled);
			expect(ledger.currentStreak).toBe(5);
			expect(ledger.longestStreak).toBe(5);
			expect(ledger.lastCompletedDate).toBe('2026-11-05');
		});

		it('restarts at 1 after a missed day with no freezes', () => {
			const ledger = foldDailyStreak(['2026-11-01', '2026-11-02', '2026-11-04']);
			expect(ledger.currentStreak).toBe(1);
			expect(ledger.longestStreak).toBe(2);
		});

		it('earns one freeze at every 7-day multiple, capped at the maximum', () => {
			expect(foldDailyStreak(run('2026-01-01', 6)).freezesAvailable).toBe(0);
			expect(foldDailyStreak(run('2026-01-01', 7)).freezesAvailable).toBe(1);
			expect(foldDailyStreak(run('2026-01-01', 14)).freezesAvailable).toBe(2);
			expect(foldDailyStreak(run('2026-01-01', 28)).freezesAvailable).toBe(
				DAILY_STREAK_MAX_FREEZES
			);
		});

		it('spends a freeze to bridge one missed day without adding length', () => {
			const dates = [...run('2026-01-01', 7), '2026-01-09'];
			const ledger = foldDailyStreak(dates);
			expect(ledger.currentStreak).toBe(8);
			expect(ledger.freezesAvailable).toBe(0);
			expect(ledger.freezesUsedTotal).toBe(1);
		});

		it('bridges a two-day gap only when two freezes are held', () => {
			const withTwo = foldDailyStreak([...run('2026-01-01', 14), '2026-01-17']);
			expect(withTwo.currentStreak).toBe(15);
			expect(withTwo.freezesAvailable).toBe(0);

			const withOne = foldDailyStreak([...run('2026-01-01', 7), '2026-01-10']);
			expect(withOne.currentStreak).toBe(1);
			expect(withOne.freezesAvailable).toBe(1);
			expect(withOne.freezesUsedTotal).toBe(0);
		});

		it('can re-earn a freeze when a bridged streak reaches the next multiple', () => {
			// Days 1-7 earn a freeze, day 8 missed (freeze spent), days 9-15 continue.
			// Streak length after day 15 is 14, which earns a new freeze.
			const dates = [...run('2026-01-01', 7), ...run('2026-01-09', 7)];
			const ledger = foldDailyStreak(dates);
			expect(ledger.currentStreak).toBe(14);
			expect(ledger.freezesAvailable).toBe(1);
			expect(ledger.freezesUsedTotal).toBe(1);
		});
	});

	describe('evaluateDailyStreak', () => {
		it('reports none for a new player', () => {
			const streak = evaluateDailyStreak([], '2026-11-20');
			expect(streak).toMatchObject({
				state: 'none',
				currentStreak: 0,
				completedToday: false,
				nextMilestone: 3,
				rulesVersion: DAILY_STREAK_RULES_VERSION
			});
		});

		it('is safe when today is completed', () => {
			const streak = evaluateDailyStreak(run('2026-11-18', 3), '2026-11-20');
			expect(streak).toMatchObject({
				state: 'safe',
				currentStreak: 3,
				completedToday: true,
				nextMilestone: 7
			});
		});

		it('is at risk when yesterday was completed but today is not', () => {
			const streak = evaluateDailyStreak(run('2026-11-17', 3), '2026-11-20');
			expect(streak).toMatchObject({
				state: 'at_risk',
				currentStreak: 3,
				completedToday: false,
				freezesPendingUse: 0
			});
		});

		it('keeps the streak alive while freezes cover missed days and reports them as pending', () => {
			// 7 days ending 2026-11-17 earns 1 freeze; 2026-11-18 is missed.
			const streak = evaluateDailyStreak(run('2026-11-11', 7), '2026-11-19');
			expect(streak).toMatchObject({
				state: 'at_risk',
				currentStreak: 7,
				freezesPendingUse: 1,
				freezesAvailable: 0
			});
		});

		it('is broken when missed days exceed held freezes, keeping longest and freezes', () => {
			const streak = evaluateDailyStreak(run('2026-11-11', 7), '2026-11-20');
			expect(streak).toMatchObject({
				state: 'broken',
				currentStreak: 0,
				longestStreak: 7,
				freezesAvailable: 1,
				freezesPendingUse: 0,
				lastCompletedDate: '2026-11-17'
			});
		});

		it('ignores dates after today', () => {
			const streak = evaluateDailyStreak(['2026-11-19', '2026-11-20', '2026-11-21'], '2026-11-20');
			expect(streak.currentStreak).toBe(2);
			expect(streak.lastCompletedDate).toBe('2026-11-20');
		});
	});

	describe('resolveNextMilestone', () => {
		it('returns the first milestone above the current streak', () => {
			expect(resolveNextMilestone(0)).toBe(3);
			expect(resolveNextMilestone(3)).toBe(7);
			expect(resolveNextMilestone(364)).toBe(365);
			expect(resolveNextMilestone(365)).toBeNull();
		});
	});

	describe('resolveDailyStreakTransition', () => {
		it('reports started for the first ever completion', () => {
			expect(resolveDailyStreakTransition(['2026-11-20'], '2026-11-20')).toEqual({
				outcome: 'started',
				previousStreak: 0,
				streakLength: 1,
				freezesUsed: 0,
				freezeEarned: false,
				milestoneReached: null
			});
		});

		it('reports extended with milestone and freeze earned on day 7', () => {
			const dates = run('2026-11-14', 7);
			expect(resolveDailyStreakTransition(dates, '2026-11-20')).toMatchObject({
				outcome: 'extended',
				previousStreak: 6,
				streakLength: 7,
				freezeEarned: true,
				milestoneReached: 7
			});
		});

		it('reports freezes used when a gap is bridged', () => {
			const dates = [...run('2026-11-01', 7), '2026-11-09'];
			expect(resolveDailyStreakTransition(dates, '2026-11-09')).toMatchObject({
				outcome: 'extended',
				previousStreak: 7,
				streakLength: 8,
				freezesUsed: 1,
				freezeEarned: false
			});
		});

		it('reports restarted with the broken streak length', () => {
			const dates = [...run('2026-11-01', 5), '2026-11-20'];
			expect(resolveDailyStreakTransition(dates, '2026-11-20')).toMatchObject({
				outcome: 'restarted',
				previousStreak: 5,
				streakLength: 1
			});
		});

		it('gives the same answer whether or not the completed date is already listed', () => {
			const prior = run('2026-11-15', 5);
			expect(resolveDailyStreakTransition(prior, '2026-11-20')).toEqual(
				resolveDailyStreakTransition([...prior, '2026-11-20'], '2026-11-20')
			);
		});
	});
});
