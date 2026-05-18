import { describe, expect, it } from 'vitest';
import { generateMemoryPatternQuestion, MEMORY_PATTERN_RULES } from './memory-pattern-generator';
import { getGeneratedQuestionErrors } from '$lib/server/challenge/rule-validator';

describe('memory pattern generator', () => {
	it.each(MEMORY_PATTERN_RULES)('generates valid %s questions', (ruleType) => {
		const question = generateMemoryPatternQuestion({
			seed: `memory-${ruleType}`,
			difficulty: 'medium',
			ruleType,
			timeLimitSeconds: 30
		});

		expect(question.questionType).toBe('memory_pattern');
		expect(question.metadata).toHaveProperty('revealSeconds');
		expect(getGeneratedQuestionErrors(question)).toEqual([]);
	});
});
