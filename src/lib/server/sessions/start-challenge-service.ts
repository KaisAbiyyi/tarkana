import { randomUUID } from 'node:crypto';
import type { RequestEvent } from '@sveltejs/kit';
import { DEFAULT_CHALLENGE_QUESTION_COUNTS, QUESTION_TYPES } from '$lib/shared/constants/challenge';
import type { ChallengeType, QuestionType } from '$lib/shared/constants/challenge';
import { getOptionalProfile } from '$lib/server/auth/guards';
import {
	generateGuestToken,
	getGuestToken,
	setGuestTokenCookie
} from '$lib/server/sessions/guest-token';
import { badRequest, notFound } from '$lib/server/errors';
import { buildChallengeQuestions, toRuleDefinition } from '$lib/server/challenge/challenge-builder';
import type {
	ChallengeCategoryDefinition,
	ChallengeConfigDefinition,
	QuestionRuleDefinition
} from '$lib/server/challenge/types';
import {
	createSessionRepository,
	type SessionRepository
} from '$lib/server/db/repositories/session-repository';
import {
	createProfileRepository,
	type ProfileRepository
} from '$lib/server/db/repositories/profile-repository';
import type { Category, ChallengeConfig } from '$lib/server/db/schema';
import { toActiveQuestionDto } from '$lib/server/sessions/dto';
import { getAnalyticsService } from '$lib/server/analytics/analytics-service';
import { getOrSetDistinctId } from '$lib/server/analytics/distinct-id';

export type StartChallengeInput = {
	challengeType: ChallengeType;
	selectedMode?: QuestionType;
	seed?: string;
};

export type StartChallengeResult = {
	sessionId: string;
	totalQuestions: number;
	currentQuestion: ReturnType<typeof toActiveQuestionDto>;
	isGuest: boolean;
};

export type StartChallengeService = {
	start(event: RequestEvent, input: StartChallengeInput): Promise<StartChallengeResult>;
};

export function createStartChallengeService(
	sessionRepository: SessionRepository = createSessionRepository(),
	profileRepository: ProfileRepository = createProfileRepository()
): StartChallengeService {
	return {
		async start(event, input) {
			if (input.selectedMode && !QUESTION_TYPES.includes(input.selectedMode)) {
				throw badRequest('selectedMode is invalid');
			}

			if (input.challengeType === 'daily') {
				const { createDailyChallengeService } =
					await import('$lib/server/challenge/daily-challenge-service');
				return createDailyChallengeService(undefined, sessionRepository, profileRepository).start(
					event
				);
			}

			const profile = await getOptionalProfile(event, profileRepository);
			const isGuest = !profile;

			let guestToken: string | null = null;
			let userRating = 0;
			let userRank:
				| 'Unranked'
				| (typeof profile extends null ? never : NonNullable<typeof profile>['rank']) = 'Unranked';

			if (profile) {
				userRating = profile.rating;
				userRank = profile.rank;
			} else {
				guestToken = getGuestToken(event) ?? generateGuestToken();
				setGuestTokenCookie(event, guestToken);
			}

			const [config, categories, rawRules] = await Promise.all([
				sessionRepository.findActiveConfig(input.challengeType),
				sessionRepository.listActiveCategories(),
				sessionRepository.listActiveQuestionRules()
			]);
			const rules = rawRules
				.map(toRuleDefinition)
				.filter((rule): rule is QuestionRuleDefinition => rule !== null);
			const challengeConfig = toChallengeConfig(config, input.challengeType);
			const challengeCategories = toChallengeCategories(categories, rules);

			const builtQuestions = buildChallengeQuestions({
				locale: event.locals.locale,
				config: challengeConfig,
				categories: challengeCategories,
				rules,
				userRating,
				selectedMode: input.selectedMode,
				seed: input.seed ?? randomUUID()
			});

			const session = await sessionRepository.createSession({
				userId: profile?.id ?? null,
				guestToken,
				challengeType: input.challengeType,
				status: 'in_progress',
				totalQuestions: builtQuestions.length,
				ratingBefore: userRating,
				ratingAfter: userRating,
				rankBefore: userRank,
				rankAfter: userRank
			});

			const persistedQuestions = await sessionRepository.addQuestions(
				builtQuestions.map((question, orderIndex) => ({
					sessionId: session.id,
					categoryId: question.categoryId,
					questionType: question.questionType,
					prompt: question.prompt,
					choices: question.choices,
					correctAnswer: question.correctAnswer,
					explanation: question.explanation,
					difficultyScore: question.difficultyScore,
					timeLimitSeconds: question.timeLimitSeconds,
					metadata: question.metadata,
					generatedSeed: question.generatedSeed,
					orderIndex
				}))
			);

			const firstQuestion = persistedQuestions[0];
			if (!firstQuestion) throw notFound('Challenge question was not created');

			try {
				const distinctId = getOrSetDistinctId(event);
				getAnalyticsService()
					.track({
						distinctId,
						userId: profile?.id ?? null,
						event: 'challenge_started',
						properties: {
							challenge_type: input.challengeType,
							is_guest: isGuest,
							session_id: session.id,
							question_count: persistedQuestions.length
						}
					})
					.catch(() => {});
			} catch {
				/* ignore */
			}

			return {
				sessionId: session.id,
				totalQuestions: persistedQuestions.length,
				currentQuestion: toActiveQuestionDto(firstQuestion),
				isGuest
			};
		}
	};
}

function toChallengeConfig(
	config: ChallengeConfig | null,
	challengeType: ChallengeType
): ChallengeConfigDefinition {
	if (config) return config;
	return {
		name: `${challengeType} default`,
		challengeType,
		questionCount: DEFAULT_CHALLENGE_QUESTION_COUNTS[challengeType],
		modeDistribution: null,
		difficultyDistribution: null,
		isActive: true
	};
}

function toChallengeCategories(
	categories: Category[],
	rules: QuestionRuleDefinition[]
): ChallengeCategoryDefinition[] {
	return categories
		.map((category) => {
			const matchingRule = rules.find((rule) => rule.categoryId === category.id);
			if (!matchingRule) return null;
			return {
				id: category.id,
				slug: category.slug,
				questionType: matchingRule.questionType,
				isActive: category.isActive
			};
		})
		.filter((category): category is ChallengeCategoryDefinition => category !== null);
}
