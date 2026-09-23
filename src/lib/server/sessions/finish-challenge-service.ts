import type { RequestEvent } from '@sveltejs/kit';
import { getOptionalProfile } from '$lib/server/auth/guards';
import { clearGuestTokenCookie, getGuestToken } from '$lib/server/sessions/guest-token';
import { badRequest, notFound, unauthorized } from '$lib/server/errors';
import {
	createProfileRepository,
	type ProfileRepository
} from '$lib/server/db/repositories/profile-repository';
import {
	createSessionRepository,
	type SessionRepository
} from '$lib/server/db/repositories/session-repository';
import {
	createDailyRepository,
	type DailyRepository
} from '$lib/server/db/repositories/daily-repository';
import type { ChallengeSession, SessionAnswer, SessionQuestion } from '$lib/server/db/schema';
import { calculateRatingDelta, applyRatingDelta } from '$lib/server/scoring/rating';
import { resolveCompletedRank, isRankPromotion, getRankProgress } from '$lib/server/scoring/rank';
import { calculateSessionScore } from '$lib/server/scoring/scoring';
import { detectSuspiciousSession } from '$lib/server/scoring/suspicious-session';
import { toResultQuestionReviewDto } from '$lib/server/sessions/dto';
import { getAnalyticsService } from '$lib/server/analytics/analytics-service';
import { getOrSetDistinctId } from '$lib/server/analytics/distinct-id';

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
	isGuest?: boolean;
	canClaim?: boolean;
};

export type FinishChallengeService = {
	finish(event: RequestEvent, input: FinishChallengeInput): Promise<FinishChallengeResult>;
};

export function createFinishChallengeService(
	sessionRepository: SessionRepository = createSessionRepository(),
	profileRepository: ProfileRepository = createProfileRepository(),
	dailyRepository: DailyRepository = createDailyRepository()
): FinishChallengeService {
	async function finishGuestSession(session: ChallengeSession, input: FinishChallengeInput) {
		const [questions, answers] = await Promise.all([
			sessionRepository.listSessionQuestions(session.id),
			sessionRepository.listSessionAnswers(session.id)
		]);
		if (questions.length === 0 || answers.length !== questions.length) return;

		const answerByQuestionId = new Map(answers.map((answer) => [answer.sessionQuestionId, answer]));
		const scoreSummary = calculateSessionScore(
			questions.map((question) => {
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
		const suspicious = detectSuspiciousSession({
			answers: answers.map((answer) => {
				const question = questions.find((item) => item.id === answer.sessionQuestionId);
				return {
					orderIndex: question?.orderIndex ?? 0,
					timeSpentSeconds: answer.timeSpentSeconds,
					timeLimitSeconds: question?.timeLimitSeconds ?? 30
				};
			}),
			tabSwitchCount: input.tabSwitchCount,
			requestAnomalyFlags: input.requestAnomalyFlags
		});
		const isDaily = session.challengeType === 'daily';
		const ratingDelta =
			isDaily || suspicious.isSuspicious ? 0 : calculateRatingDelta(scoreSummary.accuracy);
		const ratingAfter = isDaily
			? session.ratingBefore
			: applyRatingDelta(session.ratingBefore, ratingDelta);
		const rankAfter =
			isDaily || suspicious.isSuspicious ? session.rankBefore : resolveCompletedRank(ratingAfter);

		await sessionRepository.markCompleted({
			sessionId: session.id,
			totalScore: scoreSummary.totalScore,
			accuracy: scoreSummary.accuracy,
			totalTimeSeconds: scoreSummary.totalTimeSeconds,
			averageTimeSeconds: scoreSummary.averageTimeSeconds,
			ratingAfter,
			ratingDelta,
			rankAfter,
			isSuspicious: suspicious.isSuspicious,
			suspiciousReason: suspicious.reasons.join(', ') || null
		});

		if (isDaily) {
			await syncDailyAttemptCompletion(session.id, scoreSummary);
		}
	}

	async function syncDailyAttemptCompletion(
		sessionId: string,
		scoreSummary: { totalScore: number; accuracy: number; totalTimeSeconds: number }
	) {
		const attempt = await dailyRepository.findAttemptBySessionId(sessionId);
		if (attempt && attempt.status === 'in_progress') {
			await dailyRepository.completeAttempt({
				attemptId: attempt.id,
				score: scoreSummary.totalScore,
				accuracy: scoreSummary.accuracy,
				totalTimeSeconds: scoreSummary.totalTimeSeconds,
				completedAt: new Date()
			});
		}
	}

	return {
		async finish(event, input) {
			const profile = await getOptionalProfile(event, profileRepository);
			const guestToken = getGuestToken(event);

			let session: ChallengeSession | null;
			let isGuest = !profile;

			if (profile) {
				session = await sessionRepository.findOwnedSession(input.sessionId, profile.id);
				// If not found in owned sessions, but user has a guest token for this session, claim it!
				if (!session && guestToken) {
					const guestSession = await sessionRepository.findGuestSession(
						input.sessionId,
						guestToken
					);
					if (guestSession && !guestSession.claimedAt) {
						// Complete first if in_progress
						if (guestSession.status === 'in_progress') {
							await finishGuestSession(guestSession, input);
						}
						const claimResult = await sessionRepository.claimGuestSession({
							sessionId: guestSession.id,
							guestToken,
							userId: profile.id
						});
						session = claimResult.session;
						clearGuestTokenCookie(event);
						isGuest = false;
					}
				}
			} else {
				if (!guestToken) throw unauthorized('Unauthorized or guest token missing');
				session = await sessionRepository.findGuestSession(input.sessionId, guestToken);
			}

			if (!session) throw notFound('Challenge session was not found');
			if (session.status === 'abandoned') throw badRequest('Challenge session is abandoned');

			const [questions, answers] = await Promise.all([
				sessionRepository.listSessionQuestions(session.id),
				sessionRepository.listSessionAnswers(session.id, profile?.id)
			]);

			if (session.status === 'completed') {
				const result = toFinishResult({ session, questions, answers, suspiciousReasons: [] });
				return {
					...result,
					isGuest,
					canClaim: isGuest && !session.claimedAt
				};
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
			const isDaily = session.challengeType === 'daily';
			const ratingDelta =
				isDaily || suspicious.isSuspicious ? 0 : calculateRatingDelta(scoreSummary.accuracy);

			if (profile) {
				const ratingAfter = isDaily
					? profile.rating
					: applyRatingDelta(profile.rating, ratingDelta);
				const rankAfter =
					isDaily || suspicious.isSuspicious ? profile.rank : resolveCompletedRank(ratingAfter);

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
					profileRating: isDaily ? profile.rating : ratingAfter,
					profileRank: isDaily ? profile.rank : rankAfter
				});

				if (isDaily) {
					await syncDailyAttemptCompletion(session.id, scoreSummary);
				}

				const finishResult = {
					...toFinishResult({
						session: completedSession,
						questions,
						answers,
						suspiciousReasons: suspicious.reasons
					}),
					isGuest: false,
					canClaim: false
				};

				try {
					const distinctId = getOrSetDistinctId(event);
					getAnalyticsService()
						.track({
							distinctId,
							userId: profile.id,
							event: 'challenge_completed',
							properties: {
								session_id: session.id,
								challenge_type: session.challengeType,
								total_score: completedSession.totalScore,
								accuracy: completedSession.accuracy,
								total_time_seconds: completedSession.totalTimeSeconds,
								is_guest: false,
								rank_after: completedSession.rankAfter,
								rating_after: completedSession.ratingAfter
							}
						})
						.catch(() => {});
				} catch {
					/* ignore */
				}

				return finishResult;
			} else {
				const ratingAfter = isDaily
					? session.ratingBefore
					: applyRatingDelta(session.ratingBefore, ratingDelta);
				const rankAfter =
					isDaily || suspicious.isSuspicious
						? session.rankBefore
						: resolveCompletedRank(ratingAfter);

				const completedSession = await sessionRepository.markCompleted({
					sessionId: session.id,
					totalScore: scoreSummary.totalScore,
					accuracy: scoreSummary.accuracy,
					totalTimeSeconds: scoreSummary.totalTimeSeconds,
					averageTimeSeconds: scoreSummary.averageTimeSeconds,
					ratingAfter,
					ratingDelta,
					rankAfter,
					isSuspicious: suspicious.isSuspicious,
					suspiciousReason: suspicious.reasons.join(', ') || null
				});

				if (isDaily) {
					await syncDailyAttemptCompletion(session.id, scoreSummary);
				}

				const finishResult = {
					...toFinishResult({
						session: completedSession,
						questions,
						answers,
						suspiciousReasons: suspicious.reasons
					}),
					isGuest: true,
					canClaim: true
				};

				try {
					const distinctId = getOrSetDistinctId(event);
					getAnalyticsService()
						.track({
							distinctId,
							userId: null,
							event: 'challenge_completed',
							properties: {
								session_id: session.id,
								challenge_type: session.challengeType,
								total_score: completedSession.totalScore,
								accuracy: completedSession.accuracy,
								total_time_seconds: completedSession.totalTimeSeconds,
								is_guest: true,
								rank_after: completedSession.rankAfter,
								rating_after: completedSession.ratingAfter
							}
						})
						.catch(() => {});
				} catch {
					/* ignore */
				}

				return finishResult;
			}
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
