import type { RequestEvent } from '@sveltejs/kit';
import { requireProfile } from '../../server/auth/guards.ts';
import { answersMatch } from '../../server/challenge/normalization.ts';
import { badRequest, conflict, forbidden, notFound } from '../../server/errors.ts';
import {
	createProfileRepository,
	type ProfileRepository
} from '../../server/db/repositories/profile-repository.ts';
import {
	createSessionRepository,
	type SessionRepository
} from '../../server/db/repositories/session-repository.ts';
import { calculateQuestionScore } from '../../server/scoring/scoring.ts';
import { toActiveQuestionDto } from '../../server/sessions/dto.ts';

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
			const session = await sessionRepository.findOwnedSession(input.sessionId, profile.id);
			if (!session) throw notFound('Challenge session was not found');
			if (session.status === 'completed' || session.status === 'suspicious') {
				throw conflict('Challenge session is already finished');
			}

			const question = await sessionRepository.findQuestionById(input.sessionQuestionId);
			if (!question || question.sessionId !== session.id) {
				throw forbidden('Question does not belong to this session');
			}

			const existingAnswer = await sessionRepository.findAnswerForQuestion(question.id, profile.id);
			if (existingAnswer) throw conflict('Question is already answered');

			const [questions, answers] = await Promise.all([
				sessionRepository.listSessionQuestions(session.id),
				sessionRepository.listSessionAnswers(session.id, profile.id)
			]);
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

			await sessionRepository.addAnswer({
				sessionQuestionId: question.id,
				userId: profile.id,
				selectedAnswer: input.selectedAnswer.trim(),
				isCorrect,
				timeSpentSeconds,
				scoreEarned
			});

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
