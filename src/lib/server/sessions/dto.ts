import type { SessionAnswer, SessionQuestion } from '$lib/server/db/schema';
import type { ActiveQuestionDto, ResultQuestionReviewDto } from '$lib/server/challenge/types';

export function toActiveQuestionDto(question: SessionQuestion): ActiveQuestionDto {
	return {
		sessionQuestionId: question.id,
		categoryId: question.categoryId,
		questionType: question.questionType,
		prompt: question.prompt,
		choices: question.choices,
		difficultyScore: question.difficultyScore,
		timeLimitSeconds: question.timeLimitSeconds,
		metadata: question.metadata,
		generatedSeed: question.generatedSeed,
		orderIndex: question.orderIndex
	};
}

export function toResultQuestionReviewDto(input: {
	question: SessionQuestion;
	answer: SessionAnswer | null;
}): ResultQuestionReviewDto {
	return {
		sessionQuestionId: input.question.id,
		categoryId: input.question.categoryId,
		questionType: input.question.questionType,
		prompt: input.question.prompt,
		choices: input.question.choices,
		correctAnswer: input.question.correctAnswer,
		explanation: input.question.explanation,
		difficultyScore: input.question.difficultyScore,
		timeLimitSeconds: input.question.timeLimitSeconds,
		metadata: input.question.metadata,
		generatedSeed: input.question.generatedSeed,
		orderIndex: input.question.orderIndex,
		selectedAnswer: input.answer?.selectedAnswer ?? null,
		isCorrect: input.answer?.isCorrect ?? false,
		timeSpentSeconds: input.answer?.timeSpentSeconds ?? 0,
		scoreEarned: input.answer?.scoreEarned ?? 0
	};
}
