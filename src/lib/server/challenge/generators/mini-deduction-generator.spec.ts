import { describe, expect, it } from 'vitest';
import { generateMiniDeductionQuestion, MINI_DEDUCTION_RULES } from './mini-deduction-generator';
import { getGeneratedQuestionErrors } from '$lib/server/challenge/rule-validator';

describe('mini deduction generator', () => {
	it.each(MINI_DEDUCTION_RULES)('generates valid %s questions', (ruleType) => {
		const question = generateMiniDeductionQuestion({
			seed: `deduction-${ruleType}`,
			difficulty: 'medium',
			ruleType,
			timeLimitSeconds: 35
		});

		expect(question.questionType).toBe('mini_deduction');
		expect(getGeneratedQuestionErrors(question)).toEqual([]);
	});
});
