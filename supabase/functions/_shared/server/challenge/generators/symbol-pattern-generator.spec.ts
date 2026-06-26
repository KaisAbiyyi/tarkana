import { describe, expect, it } from 'vitest';
import { generateSymbolPatternQuestion, SYMBOL_PATTERN_RULES } from './symbol-pattern-generator.ts';
import { getGeneratedQuestionErrors } from '../../../server/challenge/rule-validator.ts';
import { labelSymbolToken } from '../../../shared/presentation/symbols.ts';

const TRIANGLE_DIRECTION_CHOICES = [
	'triangle-up',
	'triangle-right',
	'triangle-down',
	'triangle-left'
].sort();

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

	it.each(SYMBOL_PATTERN_RULES)('uses four visually distinct choices for %s', (ruleType) => {
		const question = generateSymbolPatternQuestion({
			seed: `triangle-choices-${ruleType}`,
			difficulty: 'medium',
			ruleType,
			timeLimitSeconds: 25
		});
		const visualLabels = question.choices.map((choice) => labelSymbolToken(choice));

		expect(question.choices).toHaveLength(4);
		expect(new Set(question.choices).size).toBe(4);
		expect(new Set(visualLabels).size).toBe(4);
		expect(question.choices).toContain(question.correctAnswer);
	});
});
