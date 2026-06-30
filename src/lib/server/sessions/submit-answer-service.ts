import type { RequestEvent } from '@sveltejs/kit';
import { requireProfile } from '$lib/server/auth/guards';
import { answersMatch } from '$lib/server/challenge/normalization';
import { badRequest, conflict, forbidden, notFound } from '$lib/server/errors';
import {
	createProfileRepository,
	type ProfileRepository
} from '$lib/server/db/repositories/profile-repository';
import {
	createSessionRepository,
	type SessionRepository
} from '$lib/server/db/repositories/session-repository';
import { calculateQuestionScore } from '$lib/server/scoring/scoring';
import { toActiveQuestionDto } from '$lib/server/sessions/dto';

export type SubmitAnswerInput = {
	sessionId: string;
	sessionQuestionId: string;
	selectedAnswer: string;
	timeSpentSeconds: number;
};

export type SubmitAnswerResult = {
	isCorrect: boolean;
	scoreEarned: number;
	isComplete: boolean;
	nextQuestion: ReturnType<typeof toActiveQuestionDto> | null;
};

export type SubmitAnswerService = {
	submit(event: RequestEvent, input: SubmitAnswerInput): Promise<SubmitAnswerResult>;
};

export function createSubmitAnswerService(
	sessionRepository: SessionRepository = createSessionRepository(),
	profileRepository: ProfileRepository = createProfileRepository(),
	now: () => Date = () => new Date()
): SubmitAnswerService {
	return {
		async submit(event, input) {
			validateInput(input);

			const profile = await requireProfile(event, profileRepository);

			const [session, question, existingAnswer, questions, answers] = await Promise.all([
				sessionRepository.findOwnedSession(input.sessionId, profile.id),
				sessionRepository.findQuestionById(input.sessionQuestionId),
				sessionRepository.findAnswerForQuestion(input.sessionQuestionId, profile.id),
				sessionRepository.listSessionQuestions(input.sessionId),
				sessionRepository.listSessionAnswers(input.sessionId, profile.id)
			]);

			if (!session) throw notFound('Challenge session was not found');
			if (session.status !== 'in_progress') throw conflict('Challenge session is not in progress');

			if (!question || question.sessionId !== session.id) {
				throw forbidden('Question does not belong to this session');
			}
			if (!question.choices.includes(input.selectedAnswer.trim())) {
				throw badRequest('Selected answer is not one of the question choices');
			}

			if (existingAnswer) throw conflict('Question is already answered');

			const answeredQuestionIds = new Set(answers.map((answer) => answer.sessionQuestionId));
			const currentQuestion = questions.find((item) => !answeredQuestionIds.has(item.id));

			if (!currentQuestion || currentQuestion.id !== question.id) {
				throw conflict('Question must be answered in order');
			}

			const timeSpentSeconds = resolveServerElapsedSeconds({
				session,
				question,
				questions,
				answers,
				now: now()
			});

			const isCorrect =
				timeSpentSeconds < question.timeLimitSeconds &&
				answersMatch(input.selectedAnswer, question.correctAnswer, {
					exactSymbols: question.questionType === 'symbol_pattern'
				});
			const scoreEarned = calculateQuestionScore({
				isCorrect,
				difficultyScore: question.difficultyScore,
				timeSpentSeconds,
				timeLimitSeconds: question.timeLimitSeconds
			});

			await Promise.all([
				sessionRepository.addAnswer({
					sessionQuestionId: question.id,
					userId: profile.id,
					selectedAnswer: input.selectedAnswer.trim(),
					isCorrect,
					timeSpentSeconds,
					scoreEarned
				}),
				sessionRepository.touchSessionUpdatedAt(session.id)
			]);

			const nextQuestion = questions.find((item) => item.orderIndex === question.orderIndex + 1);

			return {
				isCorrect,
				scoreEarned,
				isComplete: !nextQuestion,
				nextQuestion: nextQuestion ? toActiveQuestionDto(nextQuestion) : null
			};
		}
	};
}

function resolveServerElapsedSeconds(input: {
	session: { createdAt: Date };
	question: { orderIndex: number; timeLimitSeconds: number };
	questions: { id: string; orderIndex: number }[];
	answers: { sessionQuestionId: string; createdAt: Date }[];
	now: Date;
}): number {
	const previousQuestion = input.questions.find(
		(question) => question.orderIndex === input.question.orderIndex - 1
	);
	const previousAnswer = previousQuestion
		? input.answers.find((answer) => answer.sessionQuestionId === previousQuestion.id)
		: null;
	const startedAt = previousAnswer?.createdAt ?? input.session.createdAt;
	const elapsedSeconds = Math.max(0, Math.ceil((input.now.getTime() - startedAt.getTime()) / 1000));

	return Math.min(elapsedSeconds, input.question.timeLimitSeconds);
}

function validateInput(input: SubmitAnswerInput): void {
	if (input.selectedAnswer.trim().length === 0) throw badRequest('selectedAnswer is required');
	if (!Number.isFinite(input.timeSpentSeconds) || input.timeSpentSeconds < 0) {
		throw badRequest('timeSpentSeconds must be zero or greater');
	}
}
