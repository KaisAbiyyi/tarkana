import type { RequestEvent } from '@sveltejs/kit';
import { getOptionalProfile } from '$lib/server/auth/guards';
import {
	generateGuestToken,
	getGuestToken,
	hashGuestToken,
	setGuestTokenCookie
} from '$lib/server/sessions/guest-token';
import { conflict, notFound } from '$lib/server/errors';
import { toActiveQuestionDto } from '$lib/server/sessions/dto';
import type { ActiveQuestionDto } from '$lib/server/challenge/types';
import {
	createDailyRepository,
	type DailyRepository
} from '$lib/server/db/repositories/daily-repository';
import {
	createSessionRepository,
	type SessionRepository
} from '$lib/server/db/repositories/session-repository';
import {
	createProfileRepository,
	type ProfileRepository
} from '$lib/server/db/repositories/profile-repository';
import {
	generateDailyPuzzleSnapshot,
	getSecondsUntilNextUtcMidnight,
	getUtcDateString
} from '$lib/server/challenge/daily-challenge';
import type { DailyChallenge, SessionQuestion } from '$lib/server/db/schema';
import { getAnalyticsService } from '$lib/server/analytics/analytics-service';
import { getOrSetDistinctId } from '$lib/server/analytics/distinct-id';

export interface DailyStatusResult {
	date: string;
	secondsUntilReset: number;
	totalQuestions: number;
	attemptStatus: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
	activeSessionId: string | null;
	isOfficial: boolean;
	completedAttempt: {
		score: number;
		accuracy: number;
		totalTimeSeconds: number;
		completedAt: Date | null;
	} | null;
}

export interface StartDailyChallengeResult {
	sessionId: string;
	totalQuestions: number;
	currentQuestion: ActiveQuestionDto;
	isGuest: boolean;
	isResumed: boolean;
}

export interface DailyChallengeService {
	getOrCreateDailyChallenge(dateString?: string): Promise<DailyChallenge>;
	getStatus(event: RequestEvent, dateString?: string): Promise<DailyStatusResult>;
	start(event: RequestEvent, dateString?: string): Promise<StartDailyChallengeResult>;
}

export function createDailyChallengeService(
	dailyRepository: DailyRepository = createDailyRepository(),
	sessionRepository: SessionRepository = createSessionRepository(),
	profileRepository: ProfileRepository = createProfileRepository()
): DailyChallengeService {
	return {
		async getOrCreateDailyChallenge(dateString = getUtcDateString()) {
			const existing = await dailyRepository.findDailyChallengeByDate(dateString);
			if (existing) return existing;

			// Fetch active categories and rules to seed snapshot
			const [categories, rawRules] = await Promise.all([
				sessionRepository.listActiveCategories(),
				sessionRepository.listActiveQuestionRules()
			]);

			const snapshot = generateDailyPuzzleSnapshot({
				dateString,
				categories,
				rules: rawRules
			});

			return dailyRepository.getOrCreateDailyChallenge({
				challengeDate: snapshot.challengeDate,
				configVersion: snapshot.configVersion,
				generatorVersion: snapshot.generatorVersion,
				seed: snapshot.seed,
				totalQuestions: snapshot.totalQuestions,
				puzzleSnapshot: snapshot.puzzleSnapshot
			});
		},

		async getStatus(event, dateString = getUtcDateString()) {
			const daily = await this.getOrCreateDailyChallenge(dateString);
			const profile = await getOptionalProfile(event, profileRepository);
			const guestToken = getGuestToken(event);
			const guestTokenHash = guestToken ? hashGuestToken(guestToken) : null;

			let attempt = null;
			if (profile) {
				attempt = await dailyRepository.findAttemptForUser(daily.id, profile.id);
			} else if (guestTokenHash) {
				attempt = await dailyRepository.findAttemptForGuest(daily.id, guestTokenHash);
			}

			const secondsUntilReset = getSecondsUntilNextUtcMidnight();

			if (!attempt) {
				return {
					date: daily.challengeDate,
					secondsUntilReset,
					totalQuestions: daily.totalQuestions,
					attemptStatus: 'not_started',
					activeSessionId: null,
					isOfficial: true,
					completedAttempt: null
				};
			}

			return {
				date: daily.challengeDate,
				secondsUntilReset,
				totalQuestions: daily.totalQuestions,
				attemptStatus: attempt.status === 'created' ? 'in_progress' : attempt.status,
				activeSessionId:
					attempt.status === 'in_progress' || attempt.status === 'created'
						? attempt.sessionId
						: null,
				isOfficial: attempt.isOfficial,
				completedAttempt:
					attempt.status === 'completed'
						? {
								score: attempt.score,
								accuracy: attempt.accuracy,
								totalTimeSeconds: attempt.totalTimeSeconds,
								completedAt: attempt.completedAt
							}
						: null
			};
		},

		async start(event, dateString = getUtcDateString()) {
			const profile = await getOptionalProfile(event, profileRepository);
			let guestToken: string | null = null;
			let guestTokenHash: string | null = null;

			if (!profile) {
				guestToken = getGuestToken(event) ?? generateGuestToken();
				setGuestTokenCookie(event, guestToken);
				guestTokenHash = hashGuestToken(guestToken);
			}

			const distinctId = getOrSetDistinctId(event);
			const daily = await this.getOrCreateDailyChallenge(dateString);

			// Check existing attempt
			const existingAttempt = profile
				? await dailyRepository.findAttemptForUser(daily.id, profile.id)
				: await dailyRepository.findAttemptForGuest(daily.id, guestTokenHash!);

			if (existingAttempt) {
				if (existingAttempt.status === 'completed') {
					throw conflict('Daily challenge for today has already been completed');
				}

				if (existingAttempt.status === 'abandoned') {
					throw conflict('Daily challenge attempt was already forfeited');
				}

				if (existingAttempt.status === 'in_progress' && existingAttempt.sessionId) {
					// Resume existing attempt
					const session = await sessionRepository.findSessionById(existingAttempt.sessionId);
					if (session && session.status === 'in_progress') {
						const [questions, answers] = await Promise.all([
							sessionRepository.listSessionQuestions(session.id),
							sessionRepository.listSessionAnswers(session.id, profile?.id)
						]);

						const answeredQuestionIds = new Set(answers.map((a) => a.sessionQuestionId));
						const nextQuestion =
							questions.find((q) => !answeredQuestionIds.has(q.id)) ?? questions[0];

						if (nextQuestion) {
							return {
								sessionId: session.id,
								totalQuestions: session.totalQuestions,
								currentQuestion: toActiveQuestionDto(nextQuestion),
								isGuest: !profile,
								isResumed: true
							};
						}
					}
				}
			}

			// Start new official attempt
			const userRating = profile ? profile.rating : 0;
			const userRank = profile ? profile.rank : 'Unranked';

			// Create challenge session
			const session = await sessionRepository.createSession({
				userId: profile?.id ?? null,
				guestToken: guestToken ? guestTokenHash : null,
				dailyChallengeId: daily.id,
				challengeType: 'daily',
				status: 'in_progress',
				totalQuestions: daily.totalQuestions,
				ratingBefore: userRating,
				ratingAfter: userRating,
				rankBefore: userRank,
				rankAfter: userRank
			});

			// Populate questions from snapshot
			const questionsToInsert = daily.puzzleSnapshot.map((q) => ({
				sessionId: session.id,
				categoryId: q.categoryId,
				questionType: q.questionType,
				prompt: q.prompt,
				choices: q.choices,
				correctAnswer: q.correctAnswer,
				explanation: q.explanation,
				difficultyScore: q.difficultyScore,
				timeLimitSeconds: q.timeLimitSeconds,
				metadata: q.metadata,
				generatedSeed: q.generatedSeed,
				orderIndex: q.orderIndex
			}));

			const persistedQuestions = await sessionRepository.addQuestions(questionsToInsert);
			const firstQuestion = persistedQuestions[0] as SessionQuestion;
			if (!firstQuestion) throw notFound('Failed to populate daily challenge questions');

			// Create daily attempt record
			await dailyRepository.createAttempt({
				dailyChallengeId: daily.id,
				sessionId: session.id,
				userId: profile?.id ?? null,
				guestTokenHash: profile ? null : guestTokenHash,
				distinctId,
				isOfficial: true,
				status: 'in_progress'
			});

			// Track analytics
			try {
				getAnalyticsService()
					.track({
						distinctId,
						userId: profile?.id ?? null,
						event: 'challenge_started',
						properties: {
							challenge_type: 'daily',
							is_guest: !profile,
							session_id: session.id,
							question_count: daily.totalQuestions
						}
					})
					.catch(() => {});
			} catch {
				/* ignore */
			}

			return {
				sessionId: session.id,
				totalQuestions: daily.totalQuestions,
				currentQuestion: toActiveQuestionDto(firstQuestion),
				isGuest: !profile,
				isResumed: false
			};
		}
	};
}
