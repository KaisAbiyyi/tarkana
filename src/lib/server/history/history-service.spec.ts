import { describe, expect, it } from 'vitest';
import { createHistoryService } from './history-service';
import {
	createFakeEvent,
	createFakeUser,
	createProfile,
	createProfileRepositoryFake
} from '$lib/server/test/fakes';
import type {
	SessionRepository,
	DashboardSessionStats
} from '$lib/server/db/repositories/session-repository';

describe('history service', () => {
	it('requests only the authenticated user history', async () => {
		const profile = createProfile();
		let requestedUserId = '';
		const repository: SessionRepository = {
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
			listHistory: async ({ userId }) => {
				requestedUserId = userId;
				return {
					items: [],
					total: 0,
					summary: {
						totalCompleted: 0,
						bestScore: 0,
						averageAccuracy: 0,
						totalRatingDelta: null,
						averageTimeSeconds: 0,
						mode: 'standard',
						validAchievements: []
					},
					filterCounts: {
						all: 0,
						mixed: 0,
						number_sequence: 0,
						symbol_pattern: 0,
						mini_deduction: 0,
						memory_pattern: 0
					}
				};
			},
			getDashboardStats: async (): Promise<DashboardSessionStats> => ({
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
		};

		const service = createHistoryService(repository, createProfileRepositoryFake(profile));
		const result = await service.listHistory(createFakeEvent(createFakeUser({ id: profile.id })), {
			limit: 10,
			offset: 0
		});

		expect(requestedUserId).toBe(profile.id);
		expect(result.items).toEqual([]);
	});
});
