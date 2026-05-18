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
		pagination: PaginationInput
	): Promise<PaginatedResult<SessionListItemDto>>;
};

export function createHistoryService(
	sessionRepository: SessionRepository = createSessionRepository(),
	profileRepository?: ProfileRepository
): HistoryService {
	return {
		async listHistory(event, pagination) {
			const profile = await requireProfile(event, profileRepository);
			const result = await sessionRepository.listHistory({
				userId: profile.id,
				limit: pagination.limit,
				offset: pagination.offset
			});

			return {
				items: result.items.map((session) => ({
					id: session.id,
					challengeType: session.challengeType,
					status: session.status,
					totalQuestions: session.totalQuestions,
					totalScore: session.totalScore,
					accuracy: session.accuracy,
					averageTimeSeconds: session.averageTimeSeconds,
					ratingDelta: session.ratingDelta,
					rankAfter: session.rankAfter,
					createdAt: session.createdAt.toISOString()
				})),
				limit: pagination.limit,
				offset: pagination.offset,
				total: result.total
			};
		}
	};
}
