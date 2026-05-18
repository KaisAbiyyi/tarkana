export function calculateRatingDelta(accuracy: number): number {
	if (accuracy >= 90) return 40;
	if (accuracy >= 80) return 25;
	if (accuracy >= 70) return 10;
	if (accuracy >= 50) return 0;
	return -10;
}

export function applyRatingDelta(currentRating: number, delta: number): number {
	const rating = Number.isFinite(currentRating) ? Math.floor(currentRating) : 0;
	return Math.max(0, rating + delta);
}
