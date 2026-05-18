import type { DashboardStatsDto } from '$lib/shared/types/dashboard';
import { requireProfile } from '$lib/server/auth/guards';
import {
	createSessionRepository,
	type SessionRepository
} from '$lib/server/db/repositories/session-repository';
import type { ProfileRepository } from '$lib/server/db/repositories/profile-repository';
import type { RequestEvent } from '@sveltejs/kit';

export type DashboardService = {
	getDashboard(event: RequestEvent): Promise<DashboardStatsDto>;
};

export function createDashboardService(
	sessionRepository: SessionRepository = createSessionRepository(),
	profileRepository?: ProfileRepository
): DashboardService {
	return {
		async getDashboard(event) {
			const profile = await requireProfile(event, profileRepository);
			const stats = await sessionRepository.getDashboardStats(profile.id);

			return {
				currentRank: profile.rank,
				logicRating: profile.rating,
				totalCompleted: stats.totalCompleted,
				bestScore: stats.bestScore,
				averageAccuracy: roundMetric(stats.averageAccuracy),
				averageSolveTimeSeconds: roundMetric(stats.averageSolveTimeSeconds),
				strongestCategory: null,
				weakestCategory: null,
				recentSessions: stats.recentSessions.map((session) => ({
					id: session.id,
					challengeType: session.challengeType,
					totalScore: session.totalScore,
					accuracy: roundMetric(session.accuracy),
					createdAt: session.createdAt.toISOString()
				}))
			};
		}
	};
}

function roundMetric(value: number): number {
	return Math.round(value * 100) / 100;
}
