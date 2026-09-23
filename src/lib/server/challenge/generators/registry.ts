import type { QuestionType } from '$lib/shared/constants/challenge';
import {
	generateMemoryPatternQuestion,
	MEMORY_PATTERN_RULES
} from '$lib/server/challenge/generators/memory-pattern-generator';
import {
	generateMiniDeductionQuestion,
	MINI_DEDUCTION_RULES
} from '$lib/server/challenge/generators/mini-deduction-generator';
import {
	generateNumberSequenceQuestion,
	NUMBER_SEQUENCE_RULES
} from '$lib/server/challenge/generators/number-sequence-generator';
import {
	generateSymbolPatternQuestion,
	SYMBOL_PATTERN_RULES
} from '$lib/server/challenge/generators/symbol-pattern-generator';
import type { QuestionGenerator } from '$lib/server/challenge/types';

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

export const RULES_BY_QUESTION_TYPE: Record<QuestionType, readonly string[]> = {
	number_sequence: NUMBER_SEQUENCE_RULES,
	symbol_pattern: SYMBOL_PATTERN_RULES,
	mini_deduction: MINI_DEDUCTION_RULES,
	memory_pattern: MEMORY_PATTERN_RULES
};

export type RuleInventoryItem = {
	ruleType: string;
	questionType: QuestionType;
	generator: QuestionGenerator;
};

export function getRuleInventory(): RuleInventoryItem[] {
	const inventory: RuleInventoryItem[] = [];
	for (const [qType, rules] of Object.entries(RULES_BY_QUESTION_TYPE) as [
		QuestionType,
		readonly string[]
	][]) {
		const generator = GENERATORS[qType];
		for (const ruleType of rules) {
			inventory.push({ ruleType, questionType: qType, generator });
		}
	}
	return inventory;
}

export function getAllRuleTypes(): string[] {
	return getRuleInventory().map((item) => item.ruleType);
}

export function getQuestionTypeForRuleType(ruleType: string): QuestionType | null {
	return RULE_TYPE_TO_QUESTION_TYPE.get(ruleType) ?? null;
}

export function getGeneratorForQuestionType(questionType: QuestionType): QuestionGenerator {
	return GENERATORS[questionType];
}
