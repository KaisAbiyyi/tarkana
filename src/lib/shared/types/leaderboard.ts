import type { QuestionType } from '$lib/shared/constants/challenge';

export type LeaderboardTab = 'daily' | 'global' | 'tier' | 'category';

export type LeaderboardEntryDto = {
	userId: string;
	position: number;
	displayName: string;

	rank: string;
	logicRating: number;
	averageAccuracy: number;
	totalCompleted: number;
};

export type CategoryLeaderboardEntryDto = {
	userId: string;
	position: number;
	displayName: string;
	questionType: QuestionType;
	masteryRating: number;
	accuracy: number;
	totalQuestions: number;
	totalSessions: number;
};

export type DailyLeaderboardEntryDto = {
	position: number;
	displayName: string;
	logicRank: string;
	score: number;
	accuracy: number;
	totalTimeSeconds: number;
	completedAt: string;
	isCurrent?: boolean;
};

export type GuestHypotheticalRankDto = {
	hypotheticalPosition: number;
	score: number;
	accuracy: number;
	totalTimeSeconds: number;
};

export type DailyLeaderboardResultDto = {
	date: string;
	items: DailyLeaderboardEntryDto[];
	currentUserEntry: DailyLeaderboardEntryDto | null;
	guestHypotheticalEntry: GuestHypotheticalRankDto | null;
	totalParticipants: number;
	secondsUntilReset: number | null;
	limit: number;
	offset: number;
};
