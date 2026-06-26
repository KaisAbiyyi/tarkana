import { describe, expect, it } from 'vitest';
import { createDashboardService } from './dashboard-service';
import {
	createFakeEvent,
	createFakeUser,
	createProfile,
	createProfileRepositoryFake
} from '$lib/server/test/fakes';
import type { SessionRepository } from '$lib/server/db/repositories/session-repository';

describe('dashboard service', () => {
	it('returns default dashboard values for a new user', async () => {
		const profile = createProfile({ rating: 0, rank: 'Unranked' });
		const sessions: SessionRepository = {
			createSession: async () => {
				throw new Error('not used');
			},
			addQuestions: async () => [],
			addAnswer: async () => {
				throw new Error('not used');
			},
			listActiveCategories: async () => [],
			listActiveQuestionRules: async () => [],
			findActiveConfig: async () => null,
			findSessionById: async () => null,
			findOwnedSession: async () => null,
			listSessionQuestions: async () => [],
			listSessionAnswers: async () => [],
			findQuestionById: async () => null,
			findAnswerForQuestion: async () => null,
			listHistory: async () => ({
				items: [],
				total: 0,
				summary: {
					totalCompleted: 0,
					bestScore: 0,
					averageAccuracy: 0,
					totalRatingDelta: null,
					averageTimeSeconds: 0
				},
				filterCounts: {
					all: 0,
					mixed: 0,
					number_sequence: 0,
					symbol_pattern: 0,
					mini_deduction: 0,
					memory_pattern: 0
				}
			}),
			getDashboardStats: async () => ({
				totalCompleted: 0,
				bestScore: 0,
				averageAccuracy: 0,
				averageSolveTimeSeconds: 0,
				totalRatingDelta: 0,
				recentSessions: []
			}),
			markCompleted: async () => {
				throw new Error('not used');
			},
			completeSessionAndUpdateProfile: async () => {
				throw new Error('not used');
			}
		} as unknown as SessionRepository;

		const service = createDashboardService(sessions, createProfileRepositoryFake(profile));
		const dashboard = await service.getDashboard(
			createFakeEvent(createFakeUser({ id: profile.id }))
		);

		expect(dashboard).toMatchObject({
			currentRank: 'Unranked',
			logicRating: 0,
			totalCompleted: 0,
			bestScore: 0,
			averageAccuracy: 0,
			averageSolveTimeSeconds: 0,
			strongestCategory: null,
			weakestCategory: null
		});
	});
});
