/**
 * Daily Challenge streak contract shared by the web client and the API.
 *
 * The streak is computed entirely server-side from completed official daily
 * attempts (see `src/lib/server/streak/daily-streak.ts`). Clients must treat
 * every field as display-only.
 */

/**
 * - `none`: the player has never completed an official daily challenge.
 * - `safe`: today's (UTC) daily challenge is already completed.
 * - `at_risk`: the streak is alive but today's daily is not completed yet.
 *   If `freezesPendingUse > 0`, missed days are currently covered by freezes
 *   that will be consumed when the player next completes a daily.
 * - `broken`: too many days were missed; the next completion restarts at 1.
 */
export type DailyStreakState = 'none' | 'safe' | 'at_risk' | 'broken';

export interface DailyStreakDto {
	/** Consecutive UTC days kept, including freeze-covered gaps. 0 when broken or none. */
	currentStreak: number;
	/** Best streak ever reached under the current rules version. */
	longestStreak: number;
	/** Freezes still available after covering any currently missed days. */
	freezesAvailable: number;
	/** Missed days currently covered by freezes; consumed on the next completion. */
	freezesPendingUse: number;
	completedToday: boolean;
	/** UTC `YYYY-MM-DD` of the latest completed official daily, or null. */
	lastCompletedDate: string | null;
	state: DailyStreakState;
	/** Next milestone above `currentStreak`, or null once every milestone is passed. */
	nextMilestone: number | null;
	rulesVersion: number;
}
