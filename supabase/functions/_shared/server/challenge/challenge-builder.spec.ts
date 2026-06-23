import { describe, expect, it } from 'vitest';
import { buildChallengeQuestions } from './challenge-builder.ts';
import type {
	ChallengeCategoryDefinition,
	ChallengeConfigDefinition,
	QuestionRuleDefinition
} from './types.ts';

const categories: ChallengeCategoryDefinition[] = [
	{
		id: '11111111-1111-4111-8111-111111111111',
		slug: 'number',
		questionType: 'number_sequence',
		isActive: true
	},
	{
		id: '22222222-2222-4222-8222-222222222222',
		slug: 'symbol',
		questionType: 'symbol_pattern',
		isActive: true
	}
];
const rules: QuestionRuleDefinition[] = [
	{
		id: 'rule-number',
		categoryId: categories[0].id,
		questionType: 'number_sequence',
		ruleType: 'arithmetic_sequence',
		difficultyMin: 100,
		difficultyMax: 200,
		difficultyBand: null,
		timeLimitSeconds: 30,
		config: {},
		isActive: true
	},
	{
		id: 'rule-symbol',
		categoryId: categories[1].id,
		questionType: 'symbol_pattern',
		ruleType: 'alternating_symbol',
		difficultyMin: 100,
		difficultyMax: 200,
		difficultyBand: null,
		timeLimitSeconds: 30,
		config: {},
		isActive: true
	}
];
const config: ChallengeConfigDefinition = {
	name: 'standard',
	challengeType: 'standard',
	questionCount: 4,
	modeDistribution: { number_sequence: 50, symbol_pattern: 50 },
	difficultyDistribution: { easy: 100, medium: 0, hard: 0 },
	isActive: true
};

describe('challenge builder', () => {
	it('respects configured question count and active modes', () => {
		const questions = buildChallengeQuestions({
			config,
			categories,
			rules,
			userRating: 0,
			seed: 'builder'
		});

		expect(questions).toHaveLength(4);
		expect(new Set(questions.map((question) => question.questionType))).toEqual(
			new Set(['number_sequence', 'symbol_pattern'])
		);
	});

	it('filters to selected mode', () => {
		const questions = buildChallengeQuestions({
			config,
			categories,
			rules,
			userRating: 0,
			selectedMode: 'number_sequence',
			seed: 'builder-mode'
		});

		expect(questions.every((question) => question.questionType === 'number_sequence')).toBe(true);
	});

	it('fails clearly when active rules are not available', () => {
		expect(() =>
			buildChallengeQuestions({
				config,
				categories,
				rules: rules.map((rule) => ({ ...rule, isActive: false })),
				userRating: 0,
				seed: 'builder-fail'
			})
		).toThrow('No active');
	});

	it('ensures questions have unique fingerprints across the session', () => {
		const questions = buildChallengeQuestions({
			config: { ...config, questionCount: 10 },
			categories,
			rules,
			userRating: 0,
			seed: 'builder-unique'
		});

		const fingerprints = questions.map((q) => q.metadata.fingerprint);
		const uniqueFingerprints = new Set(fingerprints);

		expect(questions).toHaveLength(10);
		expect(uniqueFingerprints.size).toBe(10); // Should be strictly unique
	});
});
