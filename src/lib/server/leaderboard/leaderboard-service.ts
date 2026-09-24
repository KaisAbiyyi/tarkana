import type { RequestEvent } from '@sveltejs/kit';
import type {
	CategoryLeaderboardEntryDto,
	LeaderboardEntryDto
} from '$lib/shared/types/leaderboard';
import type { PaginatedResult, PaginationInput } from '$lib/shared/types/session';
import { requireProfile } from '$lib/server/auth/guards';
import {
	createLeaderboardRepository,
	type CategoryLeaderboardRow,
	type LeaderboardRepository,
	type LeaderboardRow
} from '$lib/server/db/repositories/leaderboard-repository';
import type { ProfileRepository } from '$lib/server/db/repositories/profile-repository';
import type { QuestionType } from '$lib/shared/constants/challenge';
import type { RankedTier } from '$lib/shared/constants/rank';
import { DEFAULT_UNRANKED_MASTERY_PRIOR } from '$lib/server/scoring/mastery';

export type CurrentUserCategoryMasteryStatus = {
	entry: CategoryLeaderboardEntryDto | null;
	isQualified: boolean;
	provisionalProgress: {
		totalQuestions: number;
		totalSessions: number;
		rating: number;
	} | null;
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

	listLeaderboard(
		event: RequestEvent,
		pagination: PaginationInput
	): Promise<PaginatedResult<LeaderboardEntryDto>>;
	getCurrentUserEntry(event: RequestEvent): Promise<LeaderboardEntryDto | null>;
};

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

		async listLeaderboard(event, pagination) {
			return this.listGlobal(event, pagination);
		},

		async getCurrentUserEntry(event) {
			return this.getCurrentUserGlobalEntry(event);
		}
	};
}
