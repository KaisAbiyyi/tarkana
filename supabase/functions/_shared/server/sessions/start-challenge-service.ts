import { randomUUID } from 'node:crypto';
import type { RequestEvent } from '@sveltejs/kit';
import {
	DEFAULT_CHALLENGE_QUESTION_COUNTS,
	QUESTION_TYPES
} from '../../shared/constants/challenge.ts';
import type { ChallengeType, QuestionType } from '../../shared/constants/challenge.ts';
import { requireProfile } from '../../server/auth/guards.ts';
import { badRequest, notFound } from '../../server/errors.ts';
import {
	buildChallengeQuestions,
	toRuleDefinition
} from '../../server/challenge/challenge-builder.ts';
import type {
	ChallengeCategoryDefinition,
	ChallengeConfigDefinition,
	QuestionRuleDefinition
} from '../../server/challenge/types.ts';
import {
	createSessionRepository,
	type SessionRepository
} from '../../server/db/repositories/session-repository.ts';
import {
	createProfileRepository,
	type ProfileRepository
} from '../../server/db/repositories/profile-repository.ts';
import type { Category, ChallengeConfig } from '../../server/db/schema.ts';
import { toActiveQuestionDto } from '../../server/sessions/dto.ts';

export type StartChallengeInput = {
	challengeType: ChallengeType;
	selectedMode?: QuestionType;
	seed?: string;
};

export type StartChallengeResult = {
	sessionId: string;
	totalQuestions: number;
	currentQuestion: ReturnType<typeof toActiveQuestionDto>;
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

			const profile = await requireProfile(event, profileRepository);
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
				userRating: profile.rating,
				selectedMode: input.selectedMode,
				seed: input.seed ?? randomUUID()
			});

			const session = await sessionRepository.createSession({
				userId: profile.id,
				challengeType: input.challengeType,
				status: 'in_progress',
				totalQuestions: builtQuestions.length,
				ratingBefore: profile.rating,
				ratingAfter: profile.rating,
				rankBefore: profile.rank,
				rankAfter: profile.rank
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

			return {
				sessionId: session.id,
				totalQuestions: persistedQuestions.length,
				currentQuestion: toActiveQuestionDto(firstQuestion)
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
