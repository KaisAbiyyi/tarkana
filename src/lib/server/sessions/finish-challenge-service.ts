import type { RequestEvent } from '@sveltejs/kit';
import { requireProfile } from '$lib/server/auth/guards';
import { badRequest, notFound } from '$lib/server/errors';
import {
	createProfileRepository,
	type ProfileRepository
} from '$lib/server/db/repositories/profile-repository';
import {
	createSessionRepository,
	type SessionRepository
} from '$lib/server/db/repositories/session-repository';
import type { ChallengeSession, SessionAnswer, SessionQuestion } from '$lib/server/db/schema';
import { calculateRatingDelta, applyRatingDelta } from '$lib/server/scoring/rating';
import { resolveCompletedRank, isRankPromotion, getRankProgress } from '$lib/server/scoring/rank';
import { calculateSessionScore } from '$lib/server/scoring/scoring';
import { detectSuspiciousSession } from '$lib/server/scoring/suspicious-session';
import { toResultQuestionReviewDto } from '$lib/server/sessions/dto';

export type FinishChallengeInput = {
	sessionId: string;
	tabSwitchCount?: number;
	requestAnomalyFlags?: string[];
};

export type FinishChallengeResult = {
	sessionId: string;
	totalScore: number;
	accuracy: number;
	correctAnswers: number;
	wrongAnswers: number;
	totalTimeSeconds: number;
	averageTimeSeconds: number;
	ratingBefore: number;
	ratingAfter: number;
	ratingDelta: number;
	rankBefore: ChallengeSession['rankBefore'];
	rankAfter: ChallengeSession['rankAfter'];
	rankPromoted: boolean;
	rankProgress: ReturnType<typeof getRankProgress>;
	isSuspicious: boolean;
	suspiciousReasons: string[];
	review: ReturnType<typeof toResultQuestionReviewDto>[];
};

export type FinishChallengeService = {
	finish(event: RequestEvent, input: FinishChallengeInput): Promise<FinishChallengeResult>;
};

export function createFinishChallengeService(
	sessionRepository: SessionRepository = createSessionRepository(),
	profileRepository: ProfileRepository = createProfileRepository()
): FinishChallengeService {
	return {
		async finish(event, input) {
			const profile = await requireProfile(event, profileRepository);
			const session = await sessionRepository.findOwnedSession(input.sessionId, profile.id);
			if (!session) throw notFound('Challenge session was not found');
			if (session.status === 'abandoned') throw badRequest('Challenge session is abandoned');

			const [questions, answers] = await Promise.all([
				sessionRepository.listSessionQuestions(session.id),
				sessionRepository.listSessionAnswers(session.id, profile.id)
			]);

			if (session.status === 'completed') {
				return toFinishResult({ session, questions, answers, suspiciousReasons: [] });
			}
			if (session.status !== 'in_progress') throw badRequest('Challenge session is not active');

			if (questions.length === 0) throw badRequest('Challenge has no questions');
			if (answers.length !== questions.length) {
				throw badRequest('Challenge cannot be finished before every question is answered');
			}

			const answerByQuestionId = new Map(
				answers.map((answer) => [answer.sessionQuestionId, answer])
			);
			const scoreSummary = calculateSessionScore(
				questions.map((question) => {
					const answer = answerByQuestionId.get(question.id);
					if (!answer) throw badRequest('Challenge is missing an answer');
					return {
						isCorrect: answer.isCorrect,
						difficultyScore: question.difficultyScore,
						timeSpentSeconds: answer.timeSpentSeconds,
						timeLimitSeconds: question.timeLimitSeconds,
						scoreEarned: answer.scoreEarned
					};
				})
			);
			const suspicious = detectSuspiciousSession({
				answers: answers.map((answer) => {
					const question = questions.find((item) => item.id === answer.sessionQuestionId);
					if (!question) throw badRequest('Answer does not match a session question');
					return {
						orderIndex: question.orderIndex,
						timeSpentSeconds: answer.timeSpentSeconds,
						timeLimitSeconds: question.timeLimitSeconds
					};
				}),
				tabSwitchCount: input.tabSwitchCount,
				requestAnomalyFlags: input.requestAnomalyFlags
			});
			const ratingDelta = suspicious.isSuspicious ? 0 : calculateRatingDelta(scoreSummary.accuracy);
			const ratingAfter = applyRatingDelta(profile.rating, ratingDelta);
			const rankAfter = suspicious.isSuspicious ? profile.rank : resolveCompletedRank(ratingAfter);

			const completedSession = await sessionRepository.completeSessionAndUpdateProfile({
				sessionId: session.id,
				userId: profile.id,
				totalScore: scoreSummary.totalScore,
				accuracy: scoreSummary.accuracy,
				totalTimeSeconds: scoreSummary.totalTimeSeconds,
				averageTimeSeconds: scoreSummary.averageTimeSeconds,
				ratingAfter,
				ratingDelta,
				rankAfter,
				isSuspicious: suspicious.isSuspicious,
				suspiciousReason: suspicious.reasons.join(', ') || null,
				profileRating: ratingAfter,
				profileRank: rankAfter
			});

			return toFinishResult({
				session: completedSession,
				questions,
				answers,
				suspiciousReasons: suspicious.reasons
			});
		}
	};
}

function toFinishResult(input: {
	session: ChallengeSession;
	questions: SessionQuestion[];
	answers: SessionAnswer[];
	suspiciousReasons: string[];
}): FinishChallengeResult {
	const answerByQuestionId = new Map(
		input.answers.map((answer) => [answer.sessionQuestionId, answer])
	);
	const scoreSummary = calculateSessionScore(
		input.questions.map((question) => {
			const answer = answerByQuestionId.get(question.id);
			return {
				isCorrect: answer?.isCorrect ?? false,
				difficultyScore: question.difficultyScore,
				timeSpentSeconds: answer?.timeSpentSeconds ?? 0,
				timeLimitSeconds: question.timeLimitSeconds,
				scoreEarned: answer?.scoreEarned ?? 0
			};
		})
	);

	return {
		sessionId: input.session.id,
		totalScore: input.session.totalScore || scoreSummary.totalScore,
		accuracy: input.session.accuracy || scoreSummary.accuracy,
		correctAnswers: scoreSummary.correctAnswers,
		wrongAnswers: scoreSummary.wrongAnswers,
		totalTimeSeconds: input.session.totalTimeSeconds || scoreSummary.totalTimeSeconds,
		averageTimeSeconds: input.session.averageTimeSeconds || scoreSummary.averageTimeSeconds,
		ratingBefore: input.session.ratingBefore,
		ratingAfter: input.session.ratingAfter,
		ratingDelta: input.session.ratingDelta,
		rankBefore: input.session.rankBefore,
		rankAfter: input.session.rankAfter,
		rankPromoted: isRankPromotion(input.session.rankBefore, input.session.rankAfter),
		rankProgress: getRankProgress(input.session.ratingAfter),
		isSuspicious: input.session.isSuspicious,
		suspiciousReasons:
			input.suspiciousReasons.length > 0
				? input.suspiciousReasons
				: (input.session.suspiciousReason?.split(', ').filter(Boolean) ?? []),
		review: input.questions.map((question) =>
			toResultQuestionReviewDto({
				question,
				answer: answerByQuestionId.get(question.id) ?? null
			})
		)
	};
}
