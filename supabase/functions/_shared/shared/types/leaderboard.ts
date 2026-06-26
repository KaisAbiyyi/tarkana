export type LeaderboardEntryDto = {
	userId: string;
	position: number;
	displayName: string;

	rank: string;
	logicRating: number;
	averageAccuracy: number;
	totalCompleted: number;
};
