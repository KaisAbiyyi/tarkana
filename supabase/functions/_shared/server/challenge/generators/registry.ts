import type { QuestionType } from '../../../shared/constants/challenge.ts';
import {
	generateMemoryPatternQuestion,
	MEMORY_PATTERN_RULES
} from '../../../server/challenge/generators/memory-pattern-generator.ts';
import {
	generateMiniDeductionQuestion,
	MINI_DEDUCTION_RULES
} from '../../../server/challenge/generators/mini-deduction-generator.ts';
import {
	generateNumberSequenceQuestion,
	NUMBER_SEQUENCE_RULES
} from '../../../server/challenge/generators/number-sequence-generator.ts';
import {
	generateSymbolPatternQuestion,
	SYMBOL_PATTERN_RULES
} from '../../../server/challenge/generators/symbol-pattern-generator.ts';
import type { QuestionGenerator } from '../../../server/challenge/types.ts';

const RULE_TYPE_TO_QUESTION_TYPE = new Map<string, QuestionType>([
	...NUMBER_SEQUENCE_RULES.map((ruleType) => [ruleType, 'number_sequence'] as const),
	...SYMBOL_PATTERN_RULES.map((ruleType) => [ruleType, 'symbol_pattern'] as const),
	...MINI_DEDUCTION_RULES.map((ruleType) => [ruleType, 'mini_deduction'] as const),
	...MEMORY_PATTERN_RULES.map((ruleType) => [ruleType, 'memory_pattern'] as const)
]);

const GENERATORS: Record<QuestionType, QuestionGenerator> = {
	number_sequence: generateNumberSequenceQuestion,
	symbol_pattern: generateSymbolPatternQuestion,
	mini_deduction: generateMiniDeductionQuestion,
	memory_pattern: generateMemoryPatternQuestion
};

export function getQuestionTypeForRuleType(ruleType: string): QuestionType | null {
	return RULE_TYPE_TO_QUESTION_TYPE.get(ruleType) ?? null;
}

export function getGeneratorForQuestionType(questionType: QuestionType): QuestionGenerator {
	return GENERATORS[questionType];
}
