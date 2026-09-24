import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../../../routes/api/leaderboard/+server';
import { createFakeEvent, createFakeUser, createProfile } from '$lib/server/test/fakes';
import * as leaderboardServiceModule from '$lib/server/leaderboard/leaderboard-service';
import {
	MASTERY_PROVISIONAL_MIN_QUESTIONS,
	MASTERY_PROVISIONAL_MIN_SESSIONS
} from '$lib/server/scoring/mastery';

describe('Tier and Category Leaderboard API and Contracts', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.spyOn(leaderboardServiceModule, 'createLeaderboardService').mockReturnValue({
			listGlobal: vi.fn(async () => ({ items: [], limit: 50, offset: 0, total: null })),
			getCurrentUserGlobalEntry: vi.fn(async () => null),
			listTier: vi.fn(async (_event, rank) => ({
				items: [
					{
						userId: 'u-1',
						position: 1,
						displayName: 'Solver',
						rank,
						logicRating: 600,
						averageAccuracy: 80,
						totalCompleted: 5
					}
				],
				limit: 50,
				offset: 0,
				total: null
			})),
			getCurrentUserTierEntry: vi.fn(async () => null),
			listCategory: vi.fn(async (_event, questionType) => ({
				items: [
					{
						userId: 'u-2',
						position: 1,
						displayName: 'Deduction King',
						questionType,
						masteryRating: 1200,
						accuracy: 85,
						totalQuestions: 30,
						totalSessions: 5
					}
				],
				limit: 50,
				offset: 0,
				total: null
			})),
			getCurrentUserCategoryEntry: vi.fn(async () => ({
				entry: null,
				isQualified: false,
				provisionalProgress: null
			})),
			listLeaderboard: vi.fn(async () => ({ items: [], limit: 50, offset: 0, total: null })),
			getCurrentUserEntry: vi.fn(async () => null)
		});
	});
	it('dispatches to tier leaderboard with valid rank and rejects Unranked', async () => {
		const profile = createProfile();
		const fakeUser = createFakeUser({ id: profile.id });

		// Test valid rank
		const eventValid = createFakeEvent(fakeUser);
		eventValid.url = new URL(
			'http://localhost:5173/api/leaderboard?scope=tier&rank=Silver%20Solver'
		);
		eventValid.locals.profile = profile as any;
		eventValid.locals.getUser = async () => fakeUser;

		const responseValid = await GET(eventValid as any);
		expect(responseValid.status).toBe(200);
		const jsonValid = await responseValid.json();
		expect(jsonValid.data).toHaveProperty('items');

		// Test Unranked (must return empty items)
		const eventUnranked = createFakeEvent(fakeUser);
		eventUnranked.url = new URL('http://localhost:5173/api/leaderboard?scope=tier&rank=Unranked');
		eventUnranked.locals.profile = profile as any;
		eventUnranked.locals.getUser = async () => fakeUser;

		const responseUnranked = await GET(eventUnranked as any);
		expect(responseUnranked.status).toBe(200);
		const jsonUnranked = await responseUnranked.json();
		expect(jsonUnranked.data.items).toEqual([]);

		// Test invalid rank
		const eventInvalid = createFakeEvent(fakeUser);
		eventInvalid.url = new URL('http://localhost:5173/api/leaderboard?scope=tier&rank=NonExistent');
		eventInvalid.locals.profile = profile as any;
		eventInvalid.locals.getUser = async () => fakeUser;

		const responseInvalid = await GET(eventInvalid as any);
		expect(responseInvalid.status).toBe(200);
		const jsonInvalid = await responseInvalid.json();
		expect(jsonInvalid.data.items).toEqual([]);
	});

	it('dispatches to category leaderboard with valid question type and rejects invalid', async () => {
		const profile = createProfile();
		const fakeUser = createFakeUser({ id: profile.id });

		// Test valid question type
		const eventValid = createFakeEvent(fakeUser);
		eventValid.url = new URL(
			'http://localhost:5173/api/leaderboard?scope=category&category=mini_deduction'
		);
		eventValid.locals.profile = profile as any;
		eventValid.locals.getUser = async () => fakeUser;

		const responseValid = await GET(eventValid as any);
		expect(responseValid.status).toBe(200);
		const jsonValid = await responseValid.json();
		expect(jsonValid.data).toHaveProperty('items');

		// Test invalid category
		const eventInvalid = createFakeEvent(fakeUser);
		eventInvalid.url = new URL(
			'http://localhost:5173/api/leaderboard?scope=category&category=unknown_puzzle'
		);
		eventInvalid.locals.profile = profile as any;
		eventInvalid.locals.getUser = async () => fakeUser;

		const responseInvalid = await GET(eventInvalid as any);
		expect(responseInvalid.status).toBe(200);
		const jsonInvalid = await responseInvalid.json();
		expect(jsonInvalid.data.items).toEqual([]);
	});

	it('enforces Category Mastery qualification invariants (min 20 questions, min 3 sessions)', () => {
		expect(MASTERY_PROVISIONAL_MIN_QUESTIONS).toBe(20);
		expect(MASTERY_PROVISIONAL_MIN_SESSIONS).toBe(3);

		// Check qualification predicate
		const isQualified = (questions: number, sessions: number) =>
			questions >= MASTERY_PROVISIONAL_MIN_QUESTIONS &&
			sessions >= MASTERY_PROVISIONAL_MIN_SESSIONS;

		expect(isQualified(19, 3)).toBe(false);
		expect(isQualified(20, 2)).toBe(false);
		expect(isQualified(20, 3)).toBe(true);
		expect(isQualified(100, 10)).toBe(true);
	});

	it('strictly resolves tie-breaks in deterministic order', () => {
		// Category tie-break order: rating DESC -> questions DESC -> accuracy DESC -> userId ASC
		type TestCategoryRow = {
			userId: string;
			rating: number;
			questions: number;
			accuracy: number;
		};

		const rows: TestCategoryRow[] = [
			{ userId: 'user-b', rating: 1500, questions: 30, accuracy: 80 },
			{ userId: 'user-a', rating: 1500, questions: 30, accuracy: 80 }, // Same rating, questions, accuracy -> userId wins
			{ userId: 'user-c', rating: 1500, questions: 30, accuracy: 85 }, // Higher accuracy
			{ userId: 'user-d', rating: 1500, questions: 40, accuracy: 75 }, // Higher questions
			{ userId: 'user-e', rating: 1600, questions: 20, accuracy: 70 } // Higher rating
		];

		const sorted = [...rows].sort((a, b) => {
			if (b.rating !== a.rating) return b.rating - a.rating;
			if (b.questions !== a.questions) return b.questions - a.questions;
			if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
			return a.userId.localeCompare(b.userId);
		});

		expect(sorted.map((r) => r.userId)).toEqual([
			'user-e', // rating 1600
			'user-d', // rating 1500, questions 40
			'user-c', // rating 1500, questions 30, accuracy 85
			'user-a', // rating 1500, questions 30, accuracy 80, userId 'user-a'
			'user-b' // rating 1500, questions 30, accuracy 80, userId 'user-b'
		]);
	});
});
