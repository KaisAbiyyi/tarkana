import type { DailyStreakDto, DailyStreakState } from '$lib/shared/types/streak';

/**
 * Daily Challenge streak engine (pure, deterministic).
 *
 * The streak is a fold over the UTC challenge dates of a player's completed,
 * official, non-suspicious daily attempts. Nothing is stored: the same input
 * always yields the same streak, so backfill, guest claims and rule changes are
 * recomputed for free. Bump `DAILY_STREAK_RULES_VERSION` whenever the rules
 * below change, because historical streaks are re-derived under the new rules.
 *
 * Rules (v1):
 * - A day counts when that day's official daily challenge is completed,
 *   regardless of accuracy. Days follow the UTC calendar (ADR-0002).
 * - Every time the streak reaches a multiple of `DAILY_STREAK_FREEZE_EARN_INTERVAL`
 *   the player earns one freeze, up to `DAILY_STREAK_MAX_FREEZES` held.
 * - Missed days are covered automatically by held freezes. Covered days keep the
 *   streak alive but do not add to its length.
 * - If more days were missed than freezes held, the streak restarts at 1 and the
 *   held freezes are kept.
 * - Streaks never affect Logic Rating, rank or any leaderboard ordering.
 */

export const DAILY_STREAK_RULES_VERSION = 1;
export const DAILY_STREAK_FREEZE_EARN_INTERVAL = 7;
export const DAILY_STREAK_MAX_FREEZES = 2;
export const DAILY_STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 365] as const;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

export function toUtcDayNumber(date: string): number {
	if (!DATE_PATTERN.test(date)) {
		throw new Error(`Invalid UTC date string: "${date}"`);
	}
	const ms = Date.parse(`${date}T00:00:00.000Z`);
	if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== date) {
		throw new Error(`Invalid UTC date string: "${date}"`);
	}
	return Math.round(ms / MS_PER_DAY);
}

function fromUtcDayNumber(day: number): string {
	return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

export interface DailyStreakLedger {
	currentStreak: number;
	longestStreak: number;
	freezesAvailable: number;
	freezesUsedTotal: number;
	lastCompletedDate: string | null;
}

/**
 * Replays the streak rules over completed dates (any order, duplicates ignored).
 * The result describes the state right after the latest completed date.
 */
export function foldDailyStreak(completedDates: readonly string[]): DailyStreakLedger {
	const days = [...new Set(completedDates.map(toUtcDayNumber))].sort((a, b) => a - b);

	let currentStreak = 0;
	let longestStreak = 0;
	let freezesAvailable = 0;
	let freezesUsedTotal = 0;
	let lastDay: number | null = null;

	for (const day of days) {
		if (lastDay === null) {
			currentStreak = 1;
		} else {
			const missedDays = day - lastDay - 1;
			if (missedDays === 0) {
				currentStreak += 1;
			} else if (missedDays <= freezesAvailable) {
				freezesAvailable -= missedDays;
				freezesUsedTotal += missedDays;
				currentStreak += 1;
			} else {
				currentStreak = 1;
			}
		}

		if (
			currentStreak % DAILY_STREAK_FREEZE_EARN_INTERVAL === 0 &&
			freezesAvailable < DAILY_STREAK_MAX_FREEZES
		) {
			freezesAvailable += 1;
		}

		longestStreak = Math.max(longestStreak, currentStreak);
		lastDay = day;
	}

	return {
		currentStreak,
		longestStreak,
		freezesAvailable,
		freezesUsedTotal,
		lastCompletedDate: lastDay === null ? null : fromUtcDayNumber(lastDay)
	};
}

export function resolveNextMilestone(currentStreak: number): number | null {
	return DAILY_STREAK_MILESTONES.find((milestone) => milestone > currentStreak) ?? null;
}

/**
 * Evaluates the streak as seen on `today` (UTC `YYYY-MM-DD`). Dates after
 * `today` are ignored. Read-only: freezes covering missed days are reported as
 * pending and only "spent" by the next completion in the fold.
 */
export function evaluateDailyStreak(
	completedDates: readonly string[],
	today: string
): DailyStreakDto {
	const todayDay = toUtcDayNumber(today);
	const pastDates = completedDates.filter((date) => toUtcDayNumber(date) <= todayDay);
	const ledger = foldDailyStreak(pastDates);

	if (ledger.lastCompletedDate === null) {
		return buildDto(ledger, 'none', 0, ledger.freezesAvailable, 0, false);
	}

	const lastDay = toUtcDayNumber(ledger.lastCompletedDate);
	if (lastDay === todayDay) {
		return buildDto(ledger, 'safe', ledger.currentStreak, ledger.freezesAvailable, 0, true);
	}

	const missedDays = todayDay - lastDay - 1;
	if (missedDays <= ledger.freezesAvailable) {
		return buildDto(
			ledger,
			'at_risk',
			ledger.currentStreak,
			ledger.freezesAvailable - missedDays,
			missedDays,
			false
		);
	}

	return buildDto(ledger, 'broken', 0, ledger.freezesAvailable, 0, false);
}

function buildDto(
	ledger: DailyStreakLedger,
	state: DailyStreakState,
	currentStreak: number,
	freezesAvailable: number,
	freezesPendingUse: number,
	completedToday: boolean
): DailyStreakDto {
	return {
		currentStreak,
		longestStreak: ledger.longestStreak,
		freezesAvailable,
		freezesPendingUse,
		completedToday,
		lastCompletedDate: ledger.lastCompletedDate,
		state,
		nextMilestone: resolveNextMilestone(currentStreak),
		rulesVersion: DAILY_STREAK_RULES_VERSION
	};
}

export type DailyStreakOutcome = 'started' | 'extended' | 'restarted';

export interface DailyStreakTransition {
	outcome: DailyStreakOutcome;
	previousStreak: number;
	streakLength: number;
	freezesUsed: number;
	freezeEarned: boolean;
	milestoneReached: number | null;
}

/**
 * Describes what completing the daily for `completedDate` did to the streak.
 * `completedDates` may or may not already contain `completedDate`.
 */
export function resolveDailyStreakTransition(
	completedDates: readonly string[],
	completedDate: string
): DailyStreakTransition {
	const completedDay = toUtcDayNumber(completedDate);
	const priorDates = completedDates.filter((date) => toUtcDayNumber(date) < completedDay);
	const before = foldDailyStreak(priorDates);
	const after = foldDailyStreak([...priorDates, completedDate]);

	let outcome: DailyStreakOutcome;
	let freezesUsed = 0;
	if (before.lastCompletedDate === null) {
		outcome = 'started';
	} else if (after.currentStreak === before.currentStreak + 1) {
		outcome = 'extended';
		freezesUsed = after.freezesUsedTotal - before.freezesUsedTotal;
	} else {
		outcome = 'restarted';
	}

	const milestoneReached = (DAILY_STREAK_MILESTONES as readonly number[]).includes(
		after.currentStreak
	)
		? after.currentStreak
		: null;

	return {
		outcome,
		previousStreak: before.currentStreak,
		streakLength: after.currentStreak,
		freezesUsed,
		freezeEarned: after.freezesAvailable > before.freezesAvailable - freezesUsed,
		milestoneReached
	};
}
