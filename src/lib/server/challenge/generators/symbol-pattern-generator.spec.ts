import { describe, expect, it } from 'vitest';
import { generateSymbolPatternQuestion, SYMBOL_PATTERN_RULES } from './symbol-pattern-generator';
import { getGeneratedQuestionErrors } from '$lib/server/challenge/rule-validator';

describe('symbol pattern generator', () => {
	it.each(SYMBOL_PATTERN_RULES)('generates valid %s questions', (ruleType) => {
		const question = generateSymbolPatternQuestion({
			seed: `symbol-${ruleType}`,
			difficulty: 'medium',
			ruleType,
			timeLimitSeconds: 25
		});

		expect(question.questionType).toBe('symbol_pattern');
		expect(getGeneratedQuestionErrors(question)).toEqual([]);
	});
});
