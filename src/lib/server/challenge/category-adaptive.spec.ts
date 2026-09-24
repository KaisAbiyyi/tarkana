import { describe, expect, it } from 'vitest';
import { buildChallengeQuestions, resolveEffectiveSkillRating } from './challenge-builder';
import type {
	AdaptiveQuestionContext,
	ChallengeCategoryDefinition,
	ChallengeConfigDefinition,
	QuestionRuleDefinition
} from './types';
import { createStartChallengeService } from '$lib/server/sessions/start-challenge-service';
import { createQuestionRule, createSessionRepositoryFake } from '$lib/server/sessions/test-fakes';
import {
	createFakeEvent,
	createFakeUser,
	createProfile,
	createProfileRepositoryFake
} from '$lib/server/test/fakes';
import { MASTERY_RATING_VERSION } from '$lib/server/scoring/mastery';

const testCategories: ChallengeCategoryDefinition[] = [
	{
		id: 'cat-num-id',
		slug: 'number',
		questionType: 'number_sequence',
		isActive: true
	},
	{
		id: 'cat-sym-id',
		slug: 'symbol',
		questionType: 'symbol_pattern',
		isActive: true
	}
];

const testRules: QuestionRuleDefinition[] = [
	// Number Sequence rules across easy, medium, hard
	{
		id: 'rule-num-easy',
		categoryId: 'cat-num-id',
		questionType: 'number_sequence',
		ruleType: 'arithmetic_sequence',
		difficultyMin: 100,
		difficultyMax: 180,
		difficultyBand: 'easy',
		timeLimitSeconds: 20,
		config: {},
		isActive: true
	},
	{
		id: 'rule-num-med',
		categoryId: 'cat-num-id',
		questionType: 'number_sequence',
		ruleType: 'geometric_sequence',
		difficultyMin: 200,
		difficultyMax: 320,
		difficultyBand: 'medium',
		timeLimitSeconds: 30,
		config: {},
		isActive: true
	},
	{
		id: 'rule-num-hard',
		categoryId: 'cat-num-id',
		questionType: 'number_sequence',
		ruleType: 'increasing_difference',
		difficultyMin: 350,
		difficultyMax: 520,
		difficultyBand: 'hard',
		timeLimitSeconds: 40,
		config: {},
		isActive: true
	},
	// Symbol Pattern rules across easy, medium, hard
	{
		id: 'rule-sym-easy',
		categoryId: 'cat-sym-id',
		questionType: 'symbol_pattern',
		ruleType: 'repeating_cycle',
		difficultyMin: 100,
		difficultyMax: 180,
		difficultyBand: 'easy',
		timeLimitSeconds: 20,
		config: {},
		isActive: true
	},
	{
		id: 'rule-sym-med',
		categoryId: 'cat-sym-id',
		questionType: 'symbol_pattern',
		ruleType: 'symbol_rotation',
		difficultyMin: 200,
		difficultyMax: 320,
		difficultyBand: 'medium',
		timeLimitSeconds: 30,
		config: {},
		isActive: true
	},
	{
		id: 'rule-sym-hard',
		categoryId: 'cat-sym-id',
		questionType: 'symbol_pattern',
		ruleType: 'shape_order',
		difficultyMin: 350,
		difficultyMax: 520,
		difficultyBand: 'hard',
		timeLimitSeconds: 40,
		config: {},
		isActive: true
	}
];

const standardConfig: ChallengeConfigDefinition = {
	name: 'Standard Challenge',
	challengeType: 'standard',
	questionCount: 10,
	modeDistribution: { number_sequence: 50, symbol_pattern: 50 },
	difficultyDistribution: null,
	isActive: true
};

describe('Milestone P1.10B: Category-Adaptive Difficulty Planning', () => {
	describe('Effective Skill Rating Resolution Hierarchy', () => {
		it('prefers explicit category mastery when available', () => {
			const res = resolveEffectiveSkillRating('number_sequence', 1200, {
				number_sequence: 1850,
				symbol_pattern: 800
			});
			expect(res.effectiveSkillRating).toBe(1850);
			expect(res.ratingSource).toBe('category_mastery');
		});

		it('falls back to global Logic Rating when category mastery is absent', () => {
			const res = resolveEffectiveSkillRating('symbol_pattern', 1200, {
				number_sequence: 1850
			});
			expect(res.effectiveSkillRating).toBe(1200);
			expect(res.ratingSource).toBe('logic_rating_fallback');
		});

		it('falls back to 0 when user is unranked and has no category mastery', () => {
			const res = resolveEffectiveSkillRating('mini_deduction', 0, undefined);
			expect(res.effectiveSkillRating).toBe(0);
			expect(res.ratingSource).toBe('logic_rating_fallback');
		});
	});

	describe('Deterministic Per-Category Adaptive Planning', () => {
		it('adapts difficulty independently per category within the same challenge round', () => {
			// Player has Diamond (2200) mastery in number_sequence, but Bronze (400) mastery in symbol_pattern
			const questions = buildChallengeQuestions({
				config: standardConfig,
				categories: testCategories,
				rules: testRules,
				userRating: 1000,
				categoryRatings: {
					number_sequence: 2200, // 2000+ tier: 0% easy, 40% med, 60% hard
					symbol_pattern: 400 // 0-499 tier: 50% easy, 40% med, 10% hard
				},
				seed: 'adaptive-per-category-seed'
			});

			expect(questions).toHaveLength(10);

			const numQuestions = questions.filter((q) => q.questionType === 'number_sequence');
			const symQuestions = questions.filter((q) => q.questionType === 'symbol_pattern');

			expect(numQuestions.length).toBeGreaterThan(0);
			expect(symQuestions.length).toBeGreaterThan(0);

			// Number sequence (Diamond tier: 2200) should have ZERO easy questions
			for (const q of numQuestions) {
				const ctx = q.metadata.adaptiveContext as AdaptiveQuestionContext;
				expect(ctx.effectiveSkillRating).toBe(2200);
				expect(ctx.ratingSource).toBe('category_mastery');
				expect(['medium', 'hard']).toContain(ctx.difficultyBand);
			}

			// Symbol pattern (Bronze tier: 400) should have easy questions present
			const symDifficulties = symQuestions.map(
				(q) => (q.metadata.adaptiveContext as AdaptiveQuestionContext).difficultyBand
			);
			expect(symDifficulties).toContain('easy');
			for (const q of symQuestions) {
				const ctx = q.metadata.adaptiveContext as AdaptiveQuestionContext;
				expect(ctx.effectiveSkillRating).toBe(400);
				expect(ctx.ratingSource).toBe('category_mastery');
			}
		});

		it('reconstructs 100% deterministically from identical inputs', () => {
			const input = {
				config: standardConfig,
				categories: testCategories,
				rules: testRules,
				userRating: 1400,
				categoryRatings: {
					number_sequence: 1600,
					symbol_pattern: 900
				},
				seed: 'deterministic-reconstruction-test-seed'
			};

			const run1 = buildChallengeQuestions(input);
			const run2 = buildChallengeQuestions(input);

			expect(run1).toHaveLength(run2.length);

			for (let i = 0; i < run1.length; i++) {
				const q1 = run1[i]!;
				const q2 = run2[i]!;

				expect(q1.questionType).toBe(q2.questionType);
				expect(q1.prompt).toBe(q2.prompt);
				expect(q1.choices).toEqual(q2.choices);
				expect(q1.correctAnswer).toBe(q2.correctAnswer);
				expect(q1.difficultyScore).toBe(q2.difficultyScore);
				expect(q1.generatedSeed).toBe(q2.generatedSeed);
				expect(q1.metadata.fingerprint).toBe(q2.metadata.fingerprint);
				expect(q1.metadata.adaptiveContext).toEqual(q2.metadata.adaptiveContext);
			}
		});

		it('produces different questions when seed changes', () => {
			const baseInput = {
				config: standardConfig,
				categories: testCategories,
				rules: testRules,
				userRating: 1000,
				categoryRatings: { number_sequence: 1200, symbol_pattern: 1200 }
			};

			const runA = buildChallengeQuestions({ ...baseInput, seed: 'seed-alpha' });
			const runB = buildChallengeQuestions({ ...baseInput, seed: 'seed-beta' });

			const promptsA = runA.map((q) => q.prompt);
			const promptsB = runB.map((q) => q.prompt);
			expect(promptsA).not.toEqual(promptsB);
		});
	});

	describe('Invariance & Override Guards', () => {
		it('preserves fixed globally uniform distribution for Daily Challenge', () => {
			const dailyConfig: ChallengeConfigDefinition = {
				name: 'Daily Challenge',
				challengeType: 'daily',
				questionCount: 10,
				modeDistribution: { number_sequence: 50, symbol_pattern: 50 },
				difficultyDistribution: { easy: 30, medium: 40, hard: 30 },
				isActive: true
			};

			// Even if player has Mastermind (2500) ratings in all categories, Daily ignores it
			const questions = buildChallengeQuestions({
				config: dailyConfig,
				categories: testCategories,
				rules: testRules,
				userRating: 2500,
				categoryRatings: { number_sequence: 2500, symbol_pattern: 2500 },
				seed: 'daily-global-invariance-seed'
			});

			const diffs = questions.map(
				(q) => (q.metadata.adaptiveContext as AdaptiveQuestionContext).difficultyBand
			);

			// Exactly 3 easy, 4 medium, 3 hard across the 10 questions
			const easyCount = diffs.filter((d) => d === 'easy').length;
			const medCount = diffs.filter((d) => d === 'medium').length;
			const hardCount = diffs.filter((d) => d === 'hard').length;

			expect(easyCount).toBe(3);
			expect(medCount).toBe(4);
			expect(hardCount).toBe(3);
		});

		it('allows explicit custom difficulty configurations to override adaptive behavior', () => {
			const customEasyConfig: ChallengeConfigDefinition = {
				name: 'Easy Practice Drill',
				challengeType: 'quick',
				questionCount: 4,
				modeDistribution: { number_sequence: 50, symbol_pattern: 50 },
				difficultyDistribution: { easy: 100, medium: 0, hard: 0 },
				isActive: true
			};

			// Player has high Diamond mastery (2300), but drill explicitly specifies 100% Easy
			const questions = buildChallengeQuestions({
				config: customEasyConfig,
				categories: testCategories,
				rules: testRules,
				userRating: 2300,
				categoryRatings: { number_sequence: 2300, symbol_pattern: 2300 },
				seed: 'custom-override-drill-seed'
			});

			expect(questions).toHaveLength(4);
			for (const q of questions) {
				const ctx = q.metadata.adaptiveContext as AdaptiveQuestionContext;
				expect(ctx.difficultyBand).toBe('easy');
			}
		});
	});

	describe('Start Challenge Service Live Adaptation Integration', () => {
		it('queries user category masteries and passes them to challenge builder', async () => {
			const profile = createProfile({ id: 'user-adaptive-test', rating: 1100 });
			const repository = createSessionRepositoryFake({
				categories: [
					{
						id: 'cat-num-id',
						name: 'Number',
						slug: 'number',
						description: null,
						isActive: true,
						createdAt: new Date(),
						updatedAt: new Date()
					}
				],
				rules: [
					createQuestionRule({
						categoryId: 'cat-num-id',
						ruleType: 'arithmetic_sequence',
						difficultyBand: 'easy',
						difficultyMin: 100,
						difficultyMax: 180
					}),
					createQuestionRule({
						categoryId: 'cat-num-id',
						ruleType: 'geometric_sequence',
						difficultyBand: 'medium',
						difficultyMin: 200,
						difficultyMax: 320
					}),
					createQuestionRule({
						categoryId: 'cat-num-id',
						ruleType: 'increasing_difference',
						difficultyBand: 'hard',
						difficultyMin: 350,
						difficultyMax: 520
					})
				],
				userCategoryMasteries: [
					{
						id: 'mastery-1',
						userId: profile.id,
						questionType: 'number_sequence',
						rating: 2100,
						totalQuestions: 40,
						correctAnswers: 35,
						totalSessions: 5,
						ratingVersion: MASTERY_RATING_VERSION,
						createdAt: new Date(),
						updatedAt: new Date()
					}
				]
			});

			const service = createStartChallengeService(repository, createProfileRepositoryFake(profile));
			const event = createFakeEvent(createFakeUser({ id: profile.id }));

			const result = await service.start(event, {
				challengeType: 'quick',
				selectedMode: 'number_sequence',
				seed: 'service-adaptive-seed'
			});

			expect(result.sessionId).toBeDefined();
			expect(result.isGuest).toBe(false);
			expect(result.totalQuestions).toBe(5);

			// Check that persisted questions captured adaptiveContext in metadata
			const persistedQuestions = await repository.listSessionQuestions(result.sessionId);
			expect(persistedQuestions.length).toBe(5);

			for (const pq of persistedQuestions) {
				const metadata = pq.metadata as { adaptiveContext?: AdaptiveQuestionContext };
				expect(metadata.adaptiveContext).toBeDefined();
				expect(metadata.adaptiveContext?.effectiveSkillRating).toBe(2100);
				expect(metadata.adaptiveContext?.ratingSource).toBe('category_mastery');
			}
		});
	});
});
