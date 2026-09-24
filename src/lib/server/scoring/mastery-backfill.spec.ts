import { describe, expect, it } from 'vitest';
import {
	executeMasteryReplay,
	type BackfillDataProvider,
	type CategoryMasteryState
} from './mastery-backfill';
import { MASTERY_RATING_VERSION } from './mastery';
import type { QuestionType } from '$lib/shared/constants/challenge';

interface MockDatabaseState {
	eligibleUserIds: string[];
	processedSessionIds: Map<string, Set<string>>; // userId -> sessionIds
	userMastery: Map<string, Map<QuestionType, CategoryMasteryState>>; // userId -> type -> state
	userVersion: Map<string, number>; // userId -> version
	sessions: Map<
		string,
		Array<{
			id: string;
			challengeType: string;
			ratingBefore: number;
			completedAt: Date | null;
			claimedAt?: Date | null;
		}>
	>;
	sessionQuestions: Map<
		string,
		Array<{
			id: string;
			questionType: QuestionType;
			difficultyScore: number;
			orderIndex: number;
		}>
	>;
	sessionAnswers: Map<
		string,
		Array<{
			sessionQuestionId: string;
			isCorrect: boolean;
		}>
	>;
	persistedChanges: Array<{
		sessionId: string;
		userId: string;
		questionType: QuestionType;
		ratingDelta: number;
		ratingBefore: number;
		ratingAfter: number;
	}>;
}

function createMockBackfillProvider(initialState: Partial<MockDatabaseState> = {}): {
	provider: BackfillDataProvider;
	state: MockDatabaseState;
} {
	const state: MockDatabaseState = {
		eligibleUserIds: initialState.eligibleUserIds ?? ['user-1'],
		processedSessionIds: initialState.processedSessionIds ?? new Map(),
		userMastery: initialState.userMastery ?? new Map(),
		userVersion: initialState.userVersion ?? new Map(),
		sessions: initialState.sessions ?? new Map(),
		sessionQuestions: initialState.sessionQuestions ?? new Map(),
		sessionAnswers: initialState.sessionAnswers ?? new Map(),
		persistedChanges: initialState.persistedChanges ?? []
	};

	const provider: BackfillDataProvider = {
		async getEligibleUserIds() {
			return state.eligibleUserIds;
		},

		async getExistingProcessedSessionIds(userId: string) {
			return new Set(state.processedSessionIds.get(userId) ?? []);
		},

		async getExistingMasteryState(userId: string) {
			const map = new Map<QuestionType, CategoryMasteryState>();
			const userMap = state.userMastery.get(userId);
			if (userMap) {
				for (const [k, v] of userMap.entries()) {
					map.set(k, { ...v });
				}
			}
			return {
				version: state.userVersion.get(userId) ?? MASTERY_RATING_VERSION,
				masteries: map
			};
		},

		async getEligibleSessions(userId: string) {
			return state.sessions.get(userId) ?? [];
		},

		async getSessionQuestionsAndAnswers(sessionId: string) {
			const questions = state.sessionQuestions.get(sessionId) ?? [];
			const answers = state.sessionAnswers.get(sessionId) ?? [];
			return { questions, answers };
		},

		async resetUserMastery(userId: string) {
			state.processedSessionIds.delete(userId);
			state.userMastery.delete(userId);
			state.persistedChanges = state.persistedChanges.filter((c) => c.userId !== userId);
		},

		async persistMasteryUpdate(data) {
			state.persistedChanges.push({
				sessionId: data.change.sessionId,
				userId: data.change.userId,
				questionType: data.change.questionType,
				ratingDelta: data.change.ratingDelta,
				ratingBefore: data.change.ratingBefore,
				ratingAfter: data.change.ratingAfter
			});

			let userMap = state.userMastery.get(data.mastery.userId);
			if (!userMap) {
				userMap = new Map();
				state.userMastery.set(data.mastery.userId, userMap);
			}
			userMap.set(data.mastery.questionType, {
				rating: data.mastery.rating,
				totalQuestions: data.mastery.totalQuestions,
				correctAnswers: data.mastery.correctAnswers,
				totalSessions: data.mastery.totalSessions
			});
			state.userVersion.set(data.mastery.userId, MASTERY_RATING_VERSION);

			let processed = state.processedSessionIds.get(data.change.userId);
			if (!processed) {
				processed = new Set();
				state.processedSessionIds.set(data.change.userId, processed);
			}
			processed.add(data.change.sessionId);
		}
	};

	return { provider, state };
}

describe('Category Mastery Backfill Utility', () => {
	it('replays sessions in chronological order and derives calibrated mastery state', async () => {
		const { provider, state } = createMockBackfillProvider();

		state.sessions.set('user-1', [
			{
				id: 's-1',
				challengeType: 'quick',
				ratingBefore: 1200,
				completedAt: new Date('2026-01-01T10:00:00Z'),
				claimedAt: null
			},
			{
				id: 's-2',
				challengeType: 'standard',
				ratingBefore: 1200,
				completedAt: new Date('2026-01-02T10:00:00Z'),
				claimedAt: null
			}
		]);

		state.sessionQuestions.set('s-1', [
			{ id: 'q-1', questionType: 'number_sequence', difficultyScore: 250, orderIndex: 0 },
			{ id: 'q-2', questionType: 'number_sequence', difficultyScore: 280, orderIndex: 1 }
		]);
		state.sessionAnswers.set('s-1', [
			{ sessionQuestionId: 'q-1', isCorrect: true },
			{ sessionQuestionId: 'q-2', isCorrect: true }
		]);

		state.sessionQuestions.set('s-2', [
			{ id: 'q-3', questionType: 'number_sequence', difficultyScore: 350, orderIndex: 0 }
		]);
		state.sessionAnswers.set('s-2', [{ sessionQuestionId: 'q-3', isCorrect: true }]);

		const summary = await executeMasteryReplay(provider);

		expect(summary.totalUsers).toBe(1);
		expect(summary.totalSessionsProcessed).toBe(2);
		expect(summary.totalSessionsSkipped).toBe(0);

		const result = summary.userResults[0];
		expect(result.userId).toBe('user-1');
		const numSeq = result.categoriesUpdated['number_sequence'];
		expect(numSeq).toBeDefined();
		expect(numSeq.totalQuestions).toBe(3);
		expect(numSeq.correctAnswers).toBe(3);
		expect(numSeq.totalSessions).toBe(2);
		expect(numSeq.rating).toBeGreaterThan(1200);

		expect(state.persistedChanges.length).toBe(2);
	});

	it('initializes unranked player with calibrated default prior (400)', async () => {
		const { provider, state } = createMockBackfillProvider();

		state.sessions.set('user-1', [
			{
				id: 's-1',
				challengeType: 'quick',
				ratingBefore: 0, // Unranked
				completedAt: new Date('2026-01-01T10:00:00Z'),
				claimedAt: null
			}
		]);

		state.sessionQuestions.set('s-1', [
			{ id: 'q-1', questionType: 'number_sequence', difficultyScore: 120, orderIndex: 0 }
		]);
		state.sessionAnswers.set('s-1', [{ sessionQuestionId: 'q-1', isCorrect: true }]);

		const summary = await executeMasteryReplay(provider);
		expect(summary.totalSessionsProcessed).toBe(1);

		const numSeq = summary.userResults[0].categoriesUpdated['number_sequence'];
		expect(numSeq.rating).toBeGreaterThan(400);
		expect(state.persistedChanges[0].ratingBefore).toBe(400);
	});

	it('strictly excludes claimed guest history sessions from mastery replay', async () => {
		const { provider, state } = createMockBackfillProvider();

		state.sessions.set('user-1', [
			{
				id: 's-guest-claimed',
				challengeType: 'quick',
				ratingBefore: 0,
				completedAt: new Date('2026-01-01T10:00:00Z'),
				claimedAt: new Date('2026-01-02T10:00:00Z') // Claimed guest session!
			},
			{
				id: 's-user-auth',
				challengeType: 'quick',
				ratingBefore: 1200,
				completedAt: new Date('2026-01-03T10:00:00Z'),
				claimedAt: null
			}
		]);

		state.sessionQuestions.set('s-guest-claimed', [
			{ id: 'q-g1', questionType: 'number_sequence', difficultyScore: 120, orderIndex: 0 }
		]);
		state.sessionAnswers.set('s-guest-claimed', [{ sessionQuestionId: 'q-g1', isCorrect: true }]);

		state.sessionQuestions.set('s-user-auth', [
			{ id: 'q-u1', questionType: 'number_sequence', difficultyScore: 250, orderIndex: 0 }
		]);
		state.sessionAnswers.set('s-user-auth', [{ sessionQuestionId: 'q-u1', isCorrect: true }]);

		const summary = await executeMasteryReplay(provider);

		expect(summary.totalSessionsProcessed).toBe(1);
		expect(summary.totalSessionsSkipped).toBe(1);

		const numSeq = summary.userResults[0].categoriesUpdated['number_sequence'];
		expect(numSeq.totalSessions).toBe(1);
		expect(numSeq.totalQuestions).toBe(1);
		expect(state.persistedChanges.length).toBe(1);
		expect(state.persistedChanges[0].sessionId).toBe('s-user-auth');
	});

	it('rebuilds from scratch when existing stored version is outdated', async () => {
		const { provider, state } = createMockBackfillProvider();

		state.sessions.set('user-1', [
			{
				id: 's-1',
				challengeType: 'quick',
				ratingBefore: 0,
				completedAt: new Date('2026-01-01T10:00:00Z'),
				claimedAt: null
			}
		]);
		state.sessionQuestions.set('s-1', [
			{ id: 'q-1', questionType: 'number_sequence', difficultyScore: 120, orderIndex: 0 }
		]);
		state.sessionAnswers.set('s-1', [{ sessionQuestionId: 'q-1', isCorrect: true }]);

		// User has version 1 data stored (outdated)
		state.userVersion.set('user-1', 1);
		state.userMastery.set(
			'user-1',
			new Map([
				[
					'number_sequence',
					{
						rating: 15,
						totalQuestions: 1,
						correctAnswers: 1,
						totalSessions: 1
					}
				]
			])
		);
		state.processedSessionIds.set('user-1', new Set(['s-1']));

		// Incremental replay should detect outdated version and rebuild under version 2
		const summary = await executeMasteryReplay(provider, { recomputeAll: false });

		expect(summary.totalSessionsProcessed).toBe(1);
		expect(summary.totalSessionsSkipped).toBe(0);

		const numSeq = summary.userResults[0].categoriesUpdated['number_sequence'];
		expect(numSeq.rating).toBeGreaterThan(400); // Recomputed with calibrated prior 400!
	});

	it('skips already processed sessions on incremental run', async () => {
		const { provider, state } = createMockBackfillProvider();

		state.sessions.set('user-1', [
			{
				id: 's-1',
				challengeType: 'quick',
				ratingBefore: 1200,
				completedAt: new Date('2026-01-01T10:00:00Z'),
				claimedAt: null
			},
			{
				id: 's-2',
				challengeType: 'quick',
				ratingBefore: 1210,
				completedAt: new Date('2026-01-02T10:00:00Z'),
				claimedAt: null
			}
		]);

		state.processedSessionIds.set('user-1', new Set(['s-1']));
		state.userMastery.set(
			'user-1',
			new Map([
				[
					'number_sequence',
					{
						rating: 1215,
						totalQuestions: 2,
						correctAnswers: 2,
						totalSessions: 1
					}
				]
			])
		);
		state.userVersion.set('user-1', MASTERY_RATING_VERSION);

		state.sessionQuestions.set('s-2', [
			{ id: 'q-3', questionType: 'number_sequence', difficultyScore: 300, orderIndex: 0 }
		]);
		state.sessionAnswers.set('s-2', [{ sessionQuestionId: 'q-3', isCorrect: true }]);

		const summary = await executeMasteryReplay(provider, { recomputeAll: false });

		expect(summary.totalSessionsProcessed).toBe(1);
		expect(summary.totalSessionsSkipped).toBe(1);

		const numSeq = summary.userResults[0].categoriesUpdated['number_sequence'];
		expect(numSeq.totalQuestions).toBe(3);
		expect(numSeq.totalSessions).toBe(2);
	});

	it('recomputes all from scratch when recomputeAll is true', async () => {
		const { provider, state } = createMockBackfillProvider();

		state.sessions.set('user-1', [
			{
				id: 's-1',
				challengeType: 'quick',
				ratingBefore: 1200,
				completedAt: new Date('2026-01-01T10:00:00Z'),
				claimedAt: null
			}
		]);
		state.sessionQuestions.set('s-1', [
			{ id: 'q-1', questionType: 'memory_pattern', difficultyScore: 250, orderIndex: 0 }
		]);
		state.sessionAnswers.set('s-1', [{ sessionQuestionId: 'q-1', isCorrect: true }]);

		state.processedSessionIds.set('user-1', new Set(['s-1']));
		state.userMastery.set(
			'user-1',
			new Map([
				[
					'memory_pattern',
					{ rating: 9999, totalQuestions: 99, correctAnswers: 99, totalSessions: 99 }
				]
			])
		);
		state.userVersion.set('user-1', MASTERY_RATING_VERSION);

		const summary = await executeMasteryReplay(provider, { recomputeAll: true });

		expect(summary.totalSessionsProcessed).toBe(1);
		expect(summary.totalSessionsSkipped).toBe(0);

		const mem = summary.userResults[0].categoriesUpdated['memory_pattern'];
		expect(mem.totalQuestions).toBe(1);
		expect(mem.totalSessions).toBe(1);
		expect(mem.rating).toBeLessThan(1300);
	});

	it('honors dryRun without persisting changes', async () => {
		const { provider, state } = createMockBackfillProvider();

		state.sessions.set('user-1', [
			{
				id: 's-1',
				challengeType: 'quick',
				ratingBefore: 1200,
				completedAt: new Date('2026-01-01T10:00:00Z'),
				claimedAt: null
			}
		]);
		state.sessionQuestions.set('s-1', [
			{ id: 'q-1', questionType: 'mini_deduction', difficultyScore: 200, orderIndex: 0 }
		]);
		state.sessionAnswers.set('s-1', [{ sessionQuestionId: 'q-1', isCorrect: true }]);

		const summary = await executeMasteryReplay(provider, { dryRun: true });

		expect(summary.dryRun).toBe(true);
		expect(summary.totalSessionsProcessed).toBe(1);
		expect(state.persistedChanges.length).toBe(0);
		expect(state.userMastery.size).toBe(0);
	});

	it('skips ineligible challenge types like daily and duel', async () => {
		const { provider, state } = createMockBackfillProvider();

		state.sessions.set('user-1', [
			{
				id: 's-daily',
				challengeType: 'daily',
				ratingBefore: 1200,
				completedAt: new Date('2026-01-01T10:00:00Z'),
				claimedAt: null
			},
			{
				id: 's-duel',
				challengeType: 'duel',
				ratingBefore: 1200,
				completedAt: new Date('2026-01-02T10:00:00Z'),
				claimedAt: null
			}
		]);

		const summary = await executeMasteryReplay(provider);

		expect(summary.totalSessionsProcessed).toBe(0);
		expect(summary.totalSessionsSkipped).toBe(2);
		expect(state.persistedChanges.length).toBe(0);
	});

	it('handles mixed multi-category sessions correctly', async () => {
		const { provider, state } = createMockBackfillProvider();

		state.sessions.set('user-1', [
			{
				id: 's-mixed',
				challengeType: 'standard',
				ratingBefore: 1000,
				completedAt: new Date('2026-01-01T10:00:00Z'),
				claimedAt: null
			}
		]);

		state.sessionQuestions.set('s-mixed', [
			{ id: 'q-1', questionType: 'number_sequence', difficultyScore: 200, orderIndex: 0 },
			{ id: 'q-2', questionType: 'symbol_pattern', difficultyScore: 200, orderIndex: 1 },
			{ id: 'q-3', questionType: 'mini_deduction', difficultyScore: 200, orderIndex: 2 },
			{ id: 'q-4', questionType: 'memory_pattern', difficultyScore: 200, orderIndex: 3 }
		]);

		state.sessionAnswers.set('s-mixed', [
			{ sessionQuestionId: 'q-1', isCorrect: true },
			{ sessionQuestionId: 'q-2', isCorrect: false },
			{ sessionQuestionId: 'q-3', isCorrect: true },
			{ sessionQuestionId: 'q-4', isCorrect: false }
		]);

		const summary = await executeMasteryReplay(provider);

		expect(summary.totalSessionsProcessed).toBe(1);
		const cats = summary.userResults[0].categoriesUpdated;

		expect(cats['number_sequence'].rating).toBeGreaterThan(1000);
		expect(cats['symbol_pattern'].rating).toBeLessThan(1000);
		expect(cats['mini_deduction'].rating).toBeGreaterThan(1000);
		expect(cats['memory_pattern'].rating).toBeLessThan(1000);

		expect(state.persistedChanges.length).toBe(4);
	});
});
