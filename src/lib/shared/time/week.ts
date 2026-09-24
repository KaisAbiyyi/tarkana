/**
 * Tarkana UTC Week Utility
 * Calculates ISO Monday 00:00 UTC -> next Monday 00:00 UTC window boundaries.
 */

export type UtcWeekBounds = {
	startOfWeek: Date;
	endOfWeek: Date;
	weekLabel: string;
	secondsUntilReset: number;
};

export function getUtcWeekBounds(refDate: Date = new Date()): UtcWeekBounds {
	const nowTime = refDate.getTime();
	const d = new Date(
		Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), refDate.getUTCDate())
	);
	const day = d.getUTCDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
	const daysSinceMonday = day === 0 ? 6 : day - 1;

	const startOfWeek = new Date(d.getTime() - daysSinceMonday * 86400000);
	const endOfWeek = new Date(startOfWeek.getTime() + 7 * 86400000);
	const secondsUntilReset = Math.max(0, Math.floor((endOfWeek.getTime() - nowTime) / 1000));

	// Canonical ISO-8601 week number calculation
	const target = new Date(startOfWeek.valueOf());
	const dayNr = (startOfWeek.getUTCDay() + 6) % 7;
	target.setUTCDate(target.getUTCDate() - dayNr + 3);
	const firstThursday = target.valueOf();
	target.setUTCMonth(0, 1);
	if (target.getUTCDay() !== 4) {
		target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
	}
	const weekNum = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
	const year = startOfWeek.getUTCFullYear();
	const weekLabel = `${year}-W${String(weekNum).padStart(2, '0')}`;

	return {
		startOfWeek,
		endOfWeek,
		weekLabel,
		secondsUntilReset
	};
}
