import type { RequestEvent } from '@sveltejs/kit';
import type { SessionListItemDto } from '$lib/shared/types/challenge';
import type { PaginatedResult, PaginationInput } from '$lib/shared/types/session';
import { requireProfile } from '$lib/server/auth/guards';
import {
	createSessionRepository,
	type SessionRepository
} from '$lib/server/db/repositories/session-repository';
import type { ProfileRepository } from '$lib/server/db/repositories/profile-repository';

export type HistoryService = {
	listHistory(
		event: RequestEvent,
		input: PaginationInput & { filter?: string | null }
	): Promise<
		PaginatedResult<SessionListItemDto> & {
			summary: {
				totalCompleted: number;
				bestScore: number;
				averageAccuracy: number;
				totalRatingDelta: number | null;
				averageTimeSeconds: number;
			};
			filterCounts: Record<string, number>;
		}
	>;
};

export function createHistoryService(
	sessionRepository: SessionRepository = createSessionRepository(),
	profileRepository?: ProfileRepository
): HistoryService {
	return {
		async listHistory(event, input) {
			const profile = await requireProfile(event, profileRepository);
			const result = await sessionRepository.listHistory({
				userId: profile.id,
				limit: input.limit,
				offset: input.offset,
				filter: input.filter
			});

			return {
				items: result.items.map((session) => ({
					id: session.id,
					challengeType: session.challengeType,
					mode: session.mode,
					status: session.status,
					totalQuestions: session.totalQuestions,
					totalScore: session.totalScore,
					accuracy: session.accuracy,
					averageTimeSeconds: session.averageTimeSeconds,
					ratingBefore: session.ratingBefore,
					ratingAfter: session.ratingAfter,
					ratingDelta: session.ratingDelta,
					rankBefore: session.rankBefore,
					rankAfter: session.rankAfter,
					createdAt: session.createdAt.toISOString(),
					completedAt: session.completedAt ? session.completedAt.toISOString() : null,
					validAchievements: session.validAchievements
				})),
				limit: input.limit,
				offset: input.offset,
				total: result.total,
				summary: {
					totalCompleted: result.summary.totalCompleted,
					bestScore: result.summary.bestScore,
					averageAccuracy: Math.round(result.summary.averageAccuracy * 100) / 100,
					totalRatingDelta: result.summary.totalRatingDelta,
					averageTimeSeconds: Math.round(result.summary.averageTimeSeconds * 100) / 100
				},
				filterCounts: result.filterCounts
			};
		}
	};
}
