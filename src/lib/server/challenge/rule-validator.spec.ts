import { describe, expect, it } from 'vitest';
import { getGeneratedQuestionErrors, validateGeneratedQuestion } from './rule-validator';
import type { GeneratedQuestion } from './types';

const validQuestion: GeneratedQuestion = {
	questionType: 'number_sequence',
	prompt: 'Find next: 1, 2, 3, ?',
	choices: ['3', '4', '5', '6'],
	correctAnswer: '4',
	explanation: 'Add one.',
	difficultyScore: 100,
	timeLimitSeconds: 30,
	metadata: { ruleType: 'arithmetic_sequence' },
	generatedSeed: 'seed'
};

describe('rule validator', () => {
	it('accepts a valid generated question', () => {
		expect(validateGeneratedQuestion(validQuestion)).toBe(validQuestion);
	});

	it('rejects ambiguous duplicate answer choices', () => {
		const errors = getGeneratedQuestionErrors({
			...validQuestion,
			choices: ['4', ' 4 ', '5', '6']
		});

		expect(errors).toContain('choices must be unique');
		expect(errors).toContain('exactly one choice must match the answer');
	});

	it('rejects missing explanation and seed', () => {
		const errors = getGeneratedQuestionErrors({
			...validQuestion,
			explanation: '',
			generatedSeed: ''
		});

		expect(errors).toEqual(
			expect.arrayContaining(['explanation is required', 'generated seed is required'])
		);
	});

	it('rejects blank answers and choices', () => {
		const errors = getGeneratedQuestionErrors({
			...validQuestion,
			correctAnswer: '',
			choices: [' ', '5']
		});

		expect(errors).toEqual(
			expect.arrayContaining(['correct answer is required', 'choices must not be empty'])
		);
	});
});
