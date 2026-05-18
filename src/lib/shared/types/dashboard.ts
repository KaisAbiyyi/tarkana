export type DashboardStatsDto = {
	currentRank: string;
	logicRating: number;
	totalCompleted: number;
	bestScore: number;
	averageAccuracy: number;
	averageSolveTimeSeconds: number;
	strongestCategory: string | null;
	weakestCategory: string | null;
	recentSessions: DashboardRecentSessionDto[];
};

export type DashboardRecentSessionDto = {
	id: string;
	challengeType: string;
	totalScore: number;
	accuracy: number;
	createdAt: string;
};
