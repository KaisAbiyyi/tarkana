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
	profileRepository: ProfileRepository = createProfileRepository()
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

			if (input.timeSpentSeconds > question.timeLimitSeconds + 2) {
				throw badRequest('timeSpentSeconds exceeds the question time limit');
			}

			const isCorrect =
				input.timeSpentSeconds < question.timeLimitSeconds &&
				answersMatch(input.selectedAnswer, question.correctAnswer, {
					exactSymbols: question.questionType === 'symbol_pattern'
				});
			const scoreEarned = calculateQuestionScore({
				isCorrect,
				difficultyScore: question.difficultyScore,
				timeSpentSeconds: input.timeSpentSeconds,
				timeLimitSeconds: question.timeLimitSeconds
			});

			await sessionRepository.addAnswer({
				sessionQuestionId: question.id,
				userId: profile.id,
				selectedAnswer: input.selectedAnswer.trim(),
				isCorrect,
				timeSpentSeconds: input.timeSpentSeconds,
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

function validateInput(input: SubmitAnswerInput): void {
	if (input.selectedAnswer.trim().length === 0) throw badRequest('selectedAnswer is required');
	if (!Number.isFinite(input.timeSpentSeconds) || input.timeSpentSeconds < 0) {
		throw badRequest('timeSpentSeconds must be zero or greater');
	}
}
