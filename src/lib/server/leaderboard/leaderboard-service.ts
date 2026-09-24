import type { RequestEvent } from '@sveltejs/kit';
import type {
	CategoryLeaderboardEntryDto,
	LeaderboardEntryDto,
	WeeklyLeaderboardEntryDto,
	WeeklyLeaderboardResultDto,
	WeeklyProgressDto
} from '$lib/shared/types/leaderboard';
import type { PaginatedResult, PaginationInput } from '$lib/shared/types/session';
import { requireProfile } from '$lib/server/auth/guards';
import {
	createLeaderboardRepository,
	type CategoryLeaderboardRow,
	type LeaderboardRepository,
	type LeaderboardRow,
	type WeeklyLeaderboardRow
} from '$lib/server/db/repositories/leaderboard-repository';
import type { ProfileRepository } from '$lib/server/db/repositories/profile-repository';
import type { QuestionType } from '$lib/shared/constants/challenge';
import type { RankedTier } from '$lib/shared/constants/rank';
import { DEFAULT_UNRANKED_MASTERY_PRIOR } from '$lib/server/scoring/mastery';
import { getUtcWeekBounds } from '$lib/shared/time/week';

export type CurrentUserCategoryMasteryStatus = {
	entry: CategoryLeaderboardEntryDto | null;
	isQualified: boolean;
	provisionalProgress: {
		totalQuestions: number;
		totalSessions: number;
		rating: number;
	} | null;
};

export type CurrentUserWeeklyStatus = {
	entry: WeeklyLeaderboardEntryDto | null;
	isQualified: boolean;
	weeklyProgress: WeeklyProgressDto | null;
};

export type LeaderboardService = {
	listGlobal(
		event: RequestEvent,
		pagination: PaginationInput
	): Promise<PaginatedResult<LeaderboardEntryDto>>;
	getCurrentUserGlobalEntry(event: RequestEvent): Promise<LeaderboardEntryDto | null>;

	listTier(
		event: RequestEvent,
		rank: RankedTier,
		pagination: PaginationInput
	): Promise<PaginatedResult<LeaderboardEntryDto>>;
	getCurrentUserTierEntry(
		event: RequestEvent,
		rank: RankedTier
	): Promise<LeaderboardEntryDto | null>;

	listCategory(
		event: RequestEvent,
		questionType: QuestionType,
		pagination: PaginationInput
	): Promise<PaginatedResult<CategoryLeaderboardEntryDto>>;
	getCurrentUserCategoryEntry(
		event: RequestEvent,
		questionType: QuestionType
	): Promise<CurrentUserCategoryMasteryStatus>;

	listWeekly(
		event: RequestEvent,
		pagination: PaginationInput,
		customDate?: Date
	): Promise<WeeklyLeaderboardResultDto>;
	getCurrentUserWeeklyEntry(
		event: RequestEvent,
		customDate?: Date
	): Promise<CurrentUserWeeklyStatus>;

	listLeaderboard(
		event: RequestEvent,
		pagination: PaginationInput
	): Promise<PaginatedResult<LeaderboardEntryDto>>;
	getCurrentUserEntry(event: RequestEvent): Promise<LeaderboardEntryDto | null>;
};

function toWeeklyLeaderboardEntryDto(row: WeeklyLeaderboardRow): WeeklyLeaderboardEntryDto {
	return {
		userId: row.userId,
		position: row.position,
		displayName: row.displayName,
		rank: row.rank,
		logicRating: row.rating,
		weeklyScore: row.weeklyScore,
		weeklyRatingDelta: row.weeklyRatingDelta,
		averageAccuracy: Math.round(Number(row.averageAccuracy) * 10) / 10,
		totalQuestions: row.totalQuestions,
		totalSessions: row.totalSessions
	};
}

function toLeaderboardEntryDto(row: LeaderboardRow): LeaderboardEntryDto {
	return {
		userId: row.userId,
		position: row.position,
		displayName: row.displayName,
		rank: row.rank,
		logicRating: row.rating,
		averageAccuracy: Math.round(Number(row.averageAccuracy) * 100) / 100,
		totalCompleted: row.totalCompleted
	};
}

function toCategoryLeaderboardEntryDto(row: CategoryLeaderboardRow): CategoryLeaderboardEntryDto {
	return {
		userId: row.userId,
		position: row.position,
		displayName: row.displayName,
		questionType: row.questionType,
		masteryRating: row.rating,
		accuracy: Math.round(Number(row.accuracy) * 10) / 10,
		totalQuestions: row.totalQuestions,
		totalSessions: row.totalSessions
	};
}

export function createLeaderboardService(
	leaderboardRepository: LeaderboardRepository = createLeaderboardRepository(),
	profileRepository?: ProfileRepository
): LeaderboardService {
	return {
		async listGlobal(event, pagination) {
			await requireProfile(event, profileRepository);
			const rows = await leaderboardRepository.listGlobal(pagination);

			return {
				items: rows.map(toLeaderboardEntryDto),
				limit: pagination.limit,
				offset: pagination.offset,
				total: null
			};
		},

		async getCurrentUserGlobalEntry(event) {
			const profile = await requireProfile(event, profileRepository);
			const row = await leaderboardRepository.getUserGlobalPosition(profile.id);
			if (!row) return null;
			return toLeaderboardEntryDto(row);
		},

		async listTier(event, rank, pagination) {
			await requireProfile(event, profileRepository);
			const rows = await leaderboardRepository.listTier({ rank, ...pagination });

			return {
				items: rows.map(toLeaderboardEntryDto),
				limit: pagination.limit,
				offset: pagination.offset,
				total: null
			};
		},

		async getCurrentUserTierEntry(event, rank) {
			const profile = await requireProfile(event, profileRepository);
			const row = await leaderboardRepository.getUserTierPosition({ userId: profile.id, rank });
			if (!row) return null;
			return toLeaderboardEntryDto(row);
		},

		async listCategory(event, questionType, pagination) {
			await requireProfile(event, profileRepository);
			const rows = await leaderboardRepository.listCategory({ questionType, ...pagination });

			return {
				items: rows.map(toCategoryLeaderboardEntryDto),
				limit: pagination.limit,
				offset: pagination.offset,
				total: null
			};
		},

		async getCurrentUserCategoryEntry(event, questionType) {
			const profile = await requireProfile(event, profileRepository);
			const row = await leaderboardRepository.getUserCategoryPosition({
				userId: profile.id,
				questionType
			});

			if (row) {
				return {
					entry: toCategoryLeaderboardEntryDto(row),
					isQualified: true,
					provisionalProgress: null
				};
			}

			const mastery = await leaderboardRepository.getUserCategoryMastery({
				userId: profile.id,
				questionType
			});

			return {
				entry: null,
				isQualified: false,
				provisionalProgress: {
					totalQuestions: mastery?.totalQuestions ?? 0,
					totalSessions: mastery?.totalSessions ?? 0,
					rating: mastery?.rating ?? DEFAULT_UNRANKED_MASTERY_PRIOR
				}
			};
		},

		async listWeekly(event, pagination, customDate) {
			await requireProfile(event, profileRepository);
			const weekBounds = getUtcWeekBounds(customDate);
			const [rows, totalParticipants] = await Promise.all([
				leaderboardRepository.listWeekly({
					startOfWeek: weekBounds.startOfWeek,
					endOfWeek: weekBounds.endOfWeek,
					...pagination
				}),
				leaderboardRepository.countWeeklyParticipants({
					startOfWeek: weekBounds.startOfWeek,
					endOfWeek: weekBounds.endOfWeek
				})
			]);

			return {
				weekLabel: weekBounds.weekLabel,
				startOfWeek: weekBounds.startOfWeek.toISOString(),
				endOfWeek: weekBounds.endOfWeek.toISOString(),
				secondsUntilReset: weekBounds.secondsUntilReset,
				items: rows.map(toWeeklyLeaderboardEntryDto),
				currentUserEntry: null,
				currentUserProgress: null,
				totalParticipants,
				limit: pagination.limit,
				offset: pagination.offset
			};
		},

		async getCurrentUserWeeklyEntry(event, customDate) {
			const profile = await requireProfile(event, profileRepository);
			const weekBounds = getUtcWeekBounds(customDate);
			const [entryRow, progress] = await Promise.all([
				leaderboardRepository.getUserWeeklyPosition({
					userId: profile.id,
					startOfWeek: weekBounds.startOfWeek,
					endOfWeek: weekBounds.endOfWeek
				}),
				leaderboardRepository.getUserWeeklyProgress({
					userId: profile.id,
					startOfWeek: weekBounds.startOfWeek,
					endOfWeek: weekBounds.endOfWeek
				})
			]);

			return {
				entry: entryRow ? toWeeklyLeaderboardEntryDto(entryRow) : null,
				isQualified: progress?.isQualified ?? false,
				weeklyProgress: progress
					? {
							totalQuestions: progress.totalQuestions,
							totalSessions: progress.totalSessions,
							weeklyScore: progress.weeklyScore,
							weeklyRatingDelta: progress.weeklyRatingDelta,
							averageAccuracy: Math.round(Number(progress.averageAccuracy) * 10) / 10,
							isQualified: progress.isQualified,
							questionsNeeded: progress.questionsNeeded
						}
					: null
			};
		},

		async listLeaderboard(event, pagination) {
			return this.listGlobal(event, pagination);
		},

		async getCurrentUserEntry(event) {
			return this.getCurrentUserGlobalEntry(event);
		}
	};
}
