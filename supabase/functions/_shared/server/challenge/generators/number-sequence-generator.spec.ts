import { describe, expect, it } from 'vitest';
import { generateNumberSequenceQuestion, NUMBER_SEQUENCE_RULES } from './number-sequence-generator.ts';
import { getGeneratedQuestionErrors } from '../../../server/challenge/rule-validator.ts';

describe('number sequence generator', () => {
	it.each(NUMBER_SEQUENCE_RULES)('generates valid %s questions', (ruleType) => {
		const question = generateNumberSequenceQuestion({
			seed: `number-${ruleType}`,
			difficulty: 'medium',
			ruleType,
			timeLimitSeconds: 30
		});

		expect(question.questionType).toBe('number_sequence');
		expect(question.explanation.toLocaleLowerCase()).toContain(ruleType.split('_')[0]);
		expect(getGeneratedQuestionErrors(question)).toEqual([]);
	});

	it('is deterministic for a fixed seed', () => {
		const input = {
			seed: 'number-sequence-arithmetic-easy-001',
			difficulty: 'easy' as const,
			ruleType: 'arithmetic_sequence',
			timeLimitSeconds: 30
		};

		expect(generateNumberSequenceQuestion(input)).toEqual(generateNumberSequenceQuestion(input));
	});
});
