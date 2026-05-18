import { QUESTION_TYPES } from '$lib/shared/constants/challenge';
import { normalizeAnswer } from '$lib/server/challenge/normalization';
import type { GeneratedQuestion } from '$lib/server/challenge/types';

export function validateGeneratedQuestion(question: GeneratedQuestion): GeneratedQuestion {
	const errors = getGeneratedQuestionErrors(question);
	if (errors.length > 0) {
		throw new Error(`Generated question is invalid: ${errors.join(', ')}`);
	}

	return question;
}

export function getGeneratedQuestionErrors(question: GeneratedQuestion): string[] {
	const errors: string[] = [];

	if (!QUESTION_TYPES.includes(question.questionType)) errors.push('question type is not allowed');
	if (question.prompt.trim().length === 0) errors.push('prompt is required');
	if (question.choices.length < 2) errors.push('at least two choices are required');
	if (
		new Set(question.choices.map((choice) => normalizeAnswer(choice))).size !==
		question.choices.length
	) {
		errors.push('choices must be unique');
	}
	if (countCorrectChoices(question) !== 1) errors.push('exactly one choice must match the answer');
	if (question.explanation.trim().length === 0) errors.push('explanation is required');
	if (!Number.isFinite(question.difficultyScore) || question.difficultyScore <= 0) {
		errors.push('difficulty score must be positive');
	}
	if (!Number.isFinite(question.timeLimitSeconds) || question.timeLimitSeconds <= 0) {
		errors.push('time limit must be positive');
	}
	if (
		typeof question.metadata.ruleType !== 'string' ||
		question.metadata.ruleType.trim().length === 0
	) {
		errors.push('metadata.ruleType is required');
	}
	if (question.generatedSeed.trim().length === 0) errors.push('generated seed is required');

	return errors;
}

function countCorrectChoices(question: GeneratedQuestion): number {
	const exactSymbols = question.questionType === 'symbol_pattern';
	const correct = normalizeAnswer(question.correctAnswer, { exactSymbols });
	return question.choices.filter((choice) => normalizeAnswer(choice, { exactSymbols }) === correct)
		.length;
}
