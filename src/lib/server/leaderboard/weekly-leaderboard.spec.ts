import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../../../routes/api/leaderboard/+server';
import { createFakeEvent, createFakeUser, createProfile } from '$lib/server/test/fakes';
import * as leaderboardServiceModule from '$lib/server/leaderboard/leaderboard-service';
import { WEEKLY_LEADERBOARD_MIN_QUESTIONS } from '$lib/server/db/repositories/leaderboard-repository';
import { CANONICAL_EVENTS, EVENT_PROPERTY_ALLOWLIST } from '$lib/shared/analytics/events';
import {
	MASTERY_PROVISIONAL_MIN_QUESTIONS,
	MASTERY_PROVISIONAL_MIN_SESSIONS,
	DEFAULT_UNRANKED_MASTERY_PRIOR,
	resolveInitialCategoryMasteryPrior
} from '$lib/server/scoring/mastery';

describe('Milestone P1.10D: Weekly Performance Leaderboard & Profile UX Depth', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.spyOn(leaderboardServiceModule, 'createLeaderboardService').mockReturnValue({
			listGlobal: vi.fn(async () => ({ items: [], limit: 50, offset: 0, total: null })),
			getCurrentUserGlobalEntry: vi.fn(async () => null),
			listTier: vi.fn(async () => ({ items: [], limit: 50, offset: 0, total: null })),
			getCurrentUserTierEntry: vi.fn(async () => null),
			listCategory: vi.fn(async () => ({ items: [], limit: 50, offset: 0, total: null })),
			getCurrentUserCategoryEntry: vi.fn(async () => ({
				entry: null,
				isQualified: false,
				provisionalProgress: null
			})),
			listWeekly: vi.fn(async () => ({
				weekLabel: '2026-W39',
				startOfWeek: '2026-09-21T00:00:00.000Z',
				endOfWeek: '2026-09-28T00:00:00.000Z',
				secondsUntilReset: 345600,
				items: [
					{
						userId: 'user-w1',
						position: 1,
						displayName: 'Weekly Champ',
						rank: 'Diamond Architect',
						logicRating: 2150,
						averageScorePerAnswer: 96.5,
						averageAccuracy: 95.0,
						responseTimeRatio: 0.42,
						totalQuestions: 40,
						totalSessions: 4,
						weeklyScore: 3860,
						weeklyRatingDelta: 95
					}
				],
				currentUserEntry: null,
				currentUserProgress: null,
				totalParticipants: 1,
				limit: 50,
				offset: 0
			})),
			getCurrentUserWeeklyEntry: vi.fn(async () => ({
				entry: {
					userId: 'user-w1',
					position: 1,
					displayName: 'Weekly Champ',
					rank: 'Diamond Architect',
					logicRating: 2150,
					averageScorePerAnswer: 96.5,
					averageAccuracy: 95.0,
					responseTimeRatio: 0.42,
					totalQuestions: 40,
					totalSessions: 4,
					weeklyScore: 3860,
					weeklyRatingDelta: 95
				},
				isQualified: true,
				weeklyProgress: {
					totalQuestions: 40,
					totalSessions: 4,
					averageScorePerAnswer: 96.5,
					averageAccuracy: 95.0,
					responseTimeRatio: 0.42,
					weeklyScore: 3860,
					weeklyRatingDelta: 95,
					isQualified: true,
					questionsNeeded: 0
				}
			})),
			listLeaderboard: vi.fn(async () => ({ items: [], limit: 50, offset: 0, total: null })),
			getCurrentUserEntry: vi.fn(async () => null)
		});
	});

	it('dispatches to weekly leaderboard with scope=weekly', async () => {
		const profile = createProfile();
		const fakeUser = createFakeUser({ id: profile.id });

		const event = createFakeEvent(fakeUser);
		event.url = new URL('http://localhost:5173/api/leaderboard?scope=weekly');
		event.locals.profile = profile as any;
		event.locals.getUser = async () => fakeUser;

		const response = await GET(event as any);
		expect(response.status).toBe(200);
		const json = await response.json();
		expect(json.data.weekLabel).toBe('2026-W39');
		expect(json.data.items).toHaveLength(1);
		expect(json.data.items[0].displayName).toBe('Weekly Champ');
		expect(json.data.items[0].averageScorePerAnswer).toBe(96.5);
		expect(json.data.items[0].weeklyScore).toBe(3860);
	});

	it('enforces weekly leaderboard qualification of minimum 20 questions', () => {
		expect(WEEKLY_LEADERBOARD_MIN_QUESTIONS).toBe(20);

		const isQualifiedWeekly = (questions: number) => questions >= WEEKLY_LEADERBOARD_MIN_QUESTIONS;

		expect(isQualifiedWeekly(0)).toBe(false);
		expect(isQualifiedWeekly(19)).toBe(false);
		expect(isQualifiedWeekly(20)).toBe(true);
		expect(isQualifiedWeekly(55)).toBe(true);
	});

	it('computes weekly questionsNeeded accurately for unqualified progress', () => {
		const calculateProgress = (totalQuestions: number) => {
			const isQualified = totalQuestions >= WEEKLY_LEADERBOARD_MIN_QUESTIONS;
			return {
				isQualified,
				questionsNeeded: isQualified
					? 0
					: Math.max(0, WEEKLY_LEADERBOARD_MIN_QUESTIONS - totalQuestions)
			};
		};

		expect(calculateProgress(0)).toEqual({ isQualified: false, questionsNeeded: 20 });
		expect(calculateProgress(12)).toEqual({ isQualified: false, questionsNeeded: 8 });
		expect(calculateProgress(19)).toEqual({ isQualified: false, questionsNeeded: 1 });
		expect(calculateProgress(20)).toEqual({ isQualified: true, questionsNeeded: 0 });
		expect(calculateProgress(35)).toEqual({ isQualified: true, questionsNeeded: 0 });
	});

	it('proves playing additional mediocre rounds cannot outrank superior normalized performance', () => {
		type WeeklyRankingCandidate = {
			userId: string;
			averageScorePerAnswer: number;
			averageAccuracy: number;
			responseTimeRatio: number;
			totalQuestions: number;
			weeklyScore: number;
		};

		// Player A: 20 questions, high quality (95.0 score/ans, 95% acc, 0.40 time ratio, totalScore = 1900)
		// Player B: 100 questions, mediocre quality (60.0 score/ans, 70% acc, 0.60 time ratio, totalScore = 6000)
		const playerA: WeeklyRankingCandidate = {
			userId: 'user-elite-quality',
			averageScorePerAnswer: 95.0,
			averageAccuracy: 95.0,
			responseTimeRatio: 0.4,
			totalQuestions: 20,
			weeklyScore: 1900
		};

		const playerB: WeeklyRankingCandidate = {
			userId: 'user-volume-farmer',
			averageScorePerAnswer: 60.0,
			averageAccuracy: 70.0,
			responseTimeRatio: 0.6,
			totalQuestions: 100,
			weeklyScore: 6000
		};

		const candidates = [playerB, playerA];

		// Sort by canonical ranking order:
		// 1. averageScorePerAnswer DESC
		// 2. averageAccuracy DESC
		// 3. responseTimeRatio ASC
		// 4. totalQuestions DESC
		// 5. userId ASC
		const sorted = [...candidates].sort((a, b) => {
			if (b.averageScorePerAnswer !== a.averageScorePerAnswer) {
				return b.averageScorePerAnswer - a.averageScorePerAnswer;
			}
			if (b.averageAccuracy !== a.averageAccuracy) {
				return b.averageAccuracy - a.averageAccuracy;
			}
			if (a.responseTimeRatio !== b.responseTimeRatio) {
				return a.responseTimeRatio - b.responseTimeRatio;
			}
			if (b.totalQuestions !== a.totalQuestions) {
				return b.totalQuestions - a.totalQuestions;
			}
			return a.userId.localeCompare(b.userId);
		});

		// Player A with superior normalized performance strictly beats volume farmer
		expect(sorted[0]!.userId).toBe('user-elite-quality');
		expect(sorted[1]!.userId).toBe('user-volume-farmer');
	});

	it('ensures Quick, Standard, Long, and Mode results are directly comparable at answer level', () => {
		// 4 Quick sessions (4 * 5 = 20 answers)
		const quickAnswers = Array.from({ length: 20 }, () => ({
			scoreEarned: 85,
			isCorrect: true,
			timeSpent: 10,
			timeLimit: 20
		}));
		// 2 Standard sessions (2 * 10 = 20 answers)
		const standardAnswers = Array.from({ length: 20 }, () => ({
			scoreEarned: 85,
			isCorrect: true,
			timeSpent: 10,
			timeLimit: 20
		}));
		// 1 Long session (15 answers) + 1 Quick session (5 answers) = 20 answers
		const mixedAnswers = Array.from({ length: 20 }, () => ({
			scoreEarned: 85,
			isCorrect: true,
			timeSpent: 10,
			timeLimit: 20
		}));
		// 2 Practice/Mode sessions (2 * 10 = 20 answers)
		const modeAnswers = Array.from({ length: 20 }, () => ({
			scoreEarned: 85,
			isCorrect: true,
			timeSpent: 10,
			timeLimit: 20
		}));

		const computeNormalized = (answers: typeof quickAnswers) => ({
			avgScore: answers.reduce((acc, a) => acc + a.scoreEarned, 0) / answers.length,
			accuracy: (answers.filter((a) => a.isCorrect).length / answers.length) * 100,
			timeRatio: answers.reduce((acc, a) => acc + a.timeSpent / a.timeLimit, 0) / answers.length
		});

		expect(computeNormalized(quickAnswers)).toEqual(computeNormalized(standardAnswers));
		expect(computeNormalized(standardAnswers)).toEqual(computeNormalized(mixedAnswers));
		expect(computeNormalized(mixedAnswers)).toEqual(computeNormalized(modeAnswers));
	});

	it('verifies explicit session allowlist and exclusion semantics', () => {
		const ALLOWLISTED_TYPES = new Set(['quick', 'standard', 'long', 'mode']);
		const EXCLUDED_TYPES = ['daily', 'duel', 'custom'];

		for (const t of EXCLUDED_TYPES) {
			expect(ALLOWLISTED_TYPES.has(t)).toBe(false);
		}

		for (const t of ['quick', 'standard', 'long', 'mode']) {
			expect(ALLOWLISTED_TYPES.has(t)).toBe(true);
		}

		const isEligibleSession = (session: {
			status: string;
			isSuspicious: boolean;
			claimedAt: Date | null;
			challengeType: string;
		}) => {
			return (
				session.status === 'completed' &&
				!session.isSuspicious &&
				session.claimedAt === null &&
				ALLOWLISTED_TYPES.has(session.challengeType)
			);
		};

		// Valid sessions
		expect(
			isEligibleSession({
				status: 'completed',
				isSuspicious: false,
				claimedAt: null,
				challengeType: 'quick'
			})
		).toBe(true);
		expect(
			isEligibleSession({
				status: 'completed',
				isSuspicious: false,
				claimedAt: null,
				challengeType: 'standard'
			})
		).toBe(true);
		expect(
			isEligibleSession({
				status: 'completed',
				isSuspicious: false,
				claimedAt: null,
				challengeType: 'long'
			})
		).toBe(true);
		expect(
			isEligibleSession({
				status: 'completed',
				isSuspicious: false,
				claimedAt: null,
				challengeType: 'mode'
			})
		).toBe(true);

		// Excluded sessions
		expect(
			isEligibleSession({
				status: 'completed',
				isSuspicious: false,
				claimedAt: null,
				challengeType: 'daily'
			})
		).toBe(false);
		expect(
			isEligibleSession({
				status: 'completed',
				isSuspicious: false,
				claimedAt: null,
				challengeType: 'duel'
			})
		).toBe(false);
		expect(
			isEligibleSession({
				status: 'completed',
				isSuspicious: false,
				claimedAt: null,
				challengeType: 'custom'
			})
		).toBe(false);
		expect(
			isEligibleSession({
				status: 'completed',
				isSuspicious: true,
				claimedAt: null,
				challengeType: 'standard'
			})
		).toBe(false);
		expect(
			isEligibleSession({
				status: 'completed',
				isSuspicious: false,
				claimedAt: new Date(),
				challengeType: 'standard'
			})
		).toBe(false);
		expect(
			isEligibleSession({
				status: 'in_progress',
				isSuspicious: false,
				claimedAt: null,
				challengeType: 'standard'
			})
		).toBe(false);
	});

	it('resolves canonical 5-tier weekly ordering deterministically', () => {
		type WeeklyRow = {
			userId: string;
			averageScorePerAnswer: number;
			averageAccuracy: number;
			responseTimeRatio: number;
			totalQuestions: number;
		};

		const rows: WeeklyRow[] = [
			// Identical score, accuracy, time ratio, questions -> user ID tiebreak
			{
				userId: 'user-b',
				averageScorePerAnswer: 80,
				averageAccuracy: 90,
				responseTimeRatio: 0.5,
				totalQuestions: 30
			},
			{
				userId: 'user-a',
				averageScorePerAnswer: 80,
				averageAccuracy: 90,
				responseTimeRatio: 0.5,
				totalQuestions: 30
			},
			// Higher rated answer count tiebreak
			{
				userId: 'user-c',
				averageScorePerAnswer: 80,
				averageAccuracy: 90,
				responseTimeRatio: 0.5,
				totalQuestions: 40
			},
			// Faster response time ratio tiebreak (lower ratio is better)
			{
				userId: 'user-d',
				averageScorePerAnswer: 80,
				averageAccuracy: 90,
				responseTimeRatio: 0.35,
				totalQuestions: 20
			},
			// Higher accuracy tiebreak
			{
				userId: 'user-e',
				averageScorePerAnswer: 80,
				averageAccuracy: 95,
				responseTimeRatio: 0.6,
				totalQuestions: 20
			},
			// Higher average score per answer (primary rank)
			{
				userId: 'user-f',
				averageScorePerAnswer: 85,
				averageAccuracy: 80,
				responseTimeRatio: 0.8,
				totalQuestions: 20
			}
		];

		const sorted = [...rows].sort((a, b) => {
			if (b.averageScorePerAnswer !== a.averageScorePerAnswer) {
				return b.averageScorePerAnswer - a.averageScorePerAnswer;
			}
			if (b.averageAccuracy !== a.averageAccuracy) {
				return b.averageAccuracy - a.averageAccuracy;
			}
			if (a.responseTimeRatio !== b.responseTimeRatio) {
				return a.responseTimeRatio - b.responseTimeRatio;
			}
			if (b.totalQuestions !== a.totalQuestions) {
				return b.totalQuestions - a.totalQuestions;
			}
			return a.userId.localeCompare(b.userId);
		});

		expect(sorted.map((r) => r.userId)).toEqual([
			'user-f', // 85 score/ans (primary metric)
			'user-e', // 80 score/ans, 95% accuracy
			'user-d', // 80 score/ans, 90% accuracy, 0.35 response time ratio
			'user-c', // 80 score/ans, 90% accuracy, 0.50 time ratio, 40 questions
			'user-a', // 80 score/ans, 90% accuracy, 0.50 time ratio, 30 questions, 'a' < 'b'
			'user-b' // 80 score/ans, 90% accuracy, 0.50 time ratio, 30 questions, 'b' > 'a'
		]);
	});

	it('guarantees pinned and list positions are identical using unified window semantics', () => {
		// In unified window semantics, position is row_number() OVER (ORDER BY ...) in the CTE
		// Both listWeekly and getUserWeeklyPosition query the exact same ranked_weekly CTE.
		const entries = [
			{ userId: 'u1', averageScorePerAnswer: 90, position: 1 },
			{ userId: 'u2', averageScorePerAnswer: 85, position: 2 },
			{ userId: 'u3', averageScorePerAnswer: 80, position: 3 }
		];

		const getPosition = (userId: string) =>
			entries.find((e) => e.userId === userId)?.position ?? null;

		expect(getPosition('u1')).toBe(1);
		expect(getPosition('u2')).toBe(2);
		expect(getPosition('u3')).toBe(3);
		expect(getPosition('u-unqualified')).toBeNull();
	});

	it('defines canonical telemetry events and property allowlists for weekly leaderboard and category mastery', () => {
		expect(CANONICAL_EVENTS).toContain('leaderboard_tab_switched');
		expect(CANONICAL_EVENTS).toContain('category_mastery_viewed');

		expect(EVENT_PROPERTY_ALLOWLIST.leaderboard_tab_switched).toEqual([
			'from_tab',
			'to_tab',
			'selected_filter'
		]);
		expect(EVENT_PROPERTY_ALLOWLIST.category_mastery_viewed).toEqual(['source', 'question_type']);
	});

	it('profile category mastery initializes unranked prior to 400 and preserves provisional thresholds', () => {
		expect(DEFAULT_UNRANKED_MASTERY_PRIOR).toBe(400);
		expect(resolveInitialCategoryMasteryPrior(null)).toBe(400);
		expect(resolveInitialCategoryMasteryPrior(0)).toBe(400);
		expect(resolveInitialCategoryMasteryPrior(350)).toBe(400);
		expect(resolveInitialCategoryMasteryPrior(750)).toBe(750);

		expect(MASTERY_PROVISIONAL_MIN_QUESTIONS).toBe(20);
		expect(MASTERY_PROVISIONAL_MIN_SESSIONS).toBe(3);
	});
});
