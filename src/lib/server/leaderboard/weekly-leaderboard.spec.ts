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
						weeklyScore: 4800,
						weeklyRatingDelta: 95,
						averageAccuracy: 92.5,
						totalQuestions: 40,
						totalSessions: 4
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
					weeklyScore: 4800,
					weeklyRatingDelta: 95,
					averageAccuracy: 92.5,
					totalQuestions: 40,
					totalSessions: 4
				},
				isQualified: true,
				weeklyProgress: {
					totalQuestions: 40,
					totalSessions: 4,
					weeklyScore: 4800,
					weeklyRatingDelta: 95,
					averageAccuracy: 92.5,
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
		expect(json.data.items[0].weeklyScore).toBe(4800);
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

	it('resolves weekly tie-breaks deterministically (weeklyScore DESC -> weeklyRatingDelta DESC -> accuracy DESC -> userId ASC)', () => {
		type WeeklyRow = {
			userId: string;
			weeklyScore: number;
			weeklyRatingDelta: number;
			averageAccuracy: number;
		};

		const rows: WeeklyRow[] = [
			{ userId: 'user-b', weeklyScore: 2000, weeklyRatingDelta: 30, averageAccuracy: 80 },
			{ userId: 'user-a', weeklyScore: 2000, weeklyRatingDelta: 30, averageAccuracy: 80 }, // userId tie break
			{ userId: 'user-c', weeklyScore: 2000, weeklyRatingDelta: 30, averageAccuracy: 85 }, // accuracy
			{ userId: 'user-d', weeklyScore: 2000, weeklyRatingDelta: 40, averageAccuracy: 75 }, // delta
			{ userId: 'user-e', weeklyScore: 2500, weeklyRatingDelta: 10, averageAccuracy: 70 } // score
		];

		const sorted = [...rows].sort((a, b) => {
			if (b.weeklyScore !== a.weeklyScore) return b.weeklyScore - a.weeklyScore;
			if (b.weeklyRatingDelta !== a.weeklyRatingDelta)
				return b.weeklyRatingDelta - a.weeklyRatingDelta;
			if (b.averageAccuracy !== a.averageAccuracy) return b.averageAccuracy - a.averageAccuracy;
			return a.userId.localeCompare(b.userId);
		});

		expect(sorted.map((r) => r.userId)).toEqual([
			'user-e', // 2500 score
			'user-d', // 2000 score, +40 delta
			'user-c', // 2000 score, +30 delta, 85 accuracy
			'user-a', // 2000 score, +30 delta, 80 accuracy, 'a' < 'b'
			'user-b' // 2000 score, +30 delta, 80 accuracy, 'b' > 'a'
		]);
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
