import type { DifficultyBand, QuestionType } from '$lib/shared/constants/challenge';
import { DIFFICULTY_BANDS, QUESTION_TYPES } from '$lib/shared/constants/challenge';
import { createSeededRng } from '$lib/server/challenge/random/seeded-rng';
import {
	expandDifficultyPlan,
	resolveDifficultyDistribution
} from '$lib/server/challenge/difficulty-resolver';
import {
	getGeneratorForQuestionType,
	getQuestionTypeForRuleType
} from '$lib/server/challenge/generators/registry';
import { validateGeneratedQuestion } from '$lib/server/challenge/rule-validator';
import type {
	AdaptiveQuestionContext,
	BuiltChallengeQuestion,
	ChallengeBuildInput,
	ChallengeCategoryDefinition,
	ChallengeConfigDefinition,
	DifficultyDistribution,
	QuestionRuleDefinition
} from '$lib/server/challenge/types';

const MAX_GENERATION_ATTEMPTS_PER_QUESTION = 12;

/**
 * Resolves the effective skill rating for difficulty adaptation in a specific category.
 * Qualified or provisional category mastery takes precedence; otherwise falls back to Logic Rating.
 */
export function resolveEffectiveSkillRating(
	questionType: QuestionType,
	userRating: number,
	categoryRatings?: Partial<Record<QuestionType, number>> | null
): { effectiveSkillRating: number; ratingSource: 'category_mastery' | 'logic_rating_fallback' } {
	const catRating = categoryRatings?.[questionType];
	if (typeof catRating === 'number' && Number.isFinite(catRating)) {
		return {
			effectiveSkillRating: Math.max(0, catRating),
			ratingSource: 'category_mastery'
		};
	}
	return {
		effectiveSkillRating:
			typeof userRating === 'number' && Number.isFinite(userRating) ? Math.max(0, userRating) : 0,
		ratingSource: 'logic_rating_fallback'
	};
}

function hasExplicitDifficultyDistribution(
	configured: Record<string, unknown> | null | undefined
): boolean {
	if (!configured) return false;
	return DIFFICULTY_BANDS.some(
		(d) => typeof configured[d] === 'number' && (configured[d] as number) > 0
	);
}

export function buildChallengeQuestions(input: ChallengeBuildInput): BuiltChallengeQuestion[] {
	validateBuildInput(input);

	const rng = createSeededRng(`${input.seed}:builder`);
	const activeCategories = input.categories.filter((category) => category.isActive);
	const activeQuestionTypes = new Set(activeCategories.map((category) => category.questionType));
	const requestedTypes = resolveQuestionTypePlan({
		questionCount: input.config.questionCount,
		config: input.config,
		selectedMode: input.selectedMode,
		availableTypes: [...activeQuestionTypes],
		rng
	});

	const assignedDifficulties: DifficultyBand[] = [];
	const assignedContexts: AdaptiveQuestionContext[] = [];

	if (input.config.challengeType === 'daily') {
		// Daily challenge uses the canonical globally-fixed difficulty distribution across the entire round
		const difficulties = rng.shuffle(
			expandDifficultyPlan({
				questionCount: input.config.questionCount,
				distribution: resolveConfiguredDifficultyDistribution(input.config.difficultyDistribution, {
					easy: 30,
					medium: 40,
					hard: 30
				})
			})
		);
		for (let i = 0; i < input.config.questionCount; i++) {
			const diff = difficulties[i] as DifficultyBand;
			assignedDifficulties[i] = diff;
			assignedContexts[i] = {
				questionType: requestedTypes[i] as QuestionType,
				effectiveSkillRating: 0,
				ratingSource: 'logic_rating_fallback',
				difficultyBand: diff
			};
		}
	} else {
		// Deterministic per-category planning for competitive and custom challenges
		// 1. Group question slots by questionType
		const slotsByType = new Map<QuestionType, number[]>();
		for (let i = 0; i < input.config.questionCount; i++) {
			const qType = requestedTypes[i] as QuestionType;
			const list = slotsByType.get(qType) ?? [];
			list.push(i);
			slotsByType.set(qType, list);
		}

		const isExplicitCustom = hasExplicitDifficultyDistribution(input.config.difficultyDistribution);

		// 2. Plan and shuffle each category independently
		for (const [qType, slotIndices] of slotsByType.entries()) {
			// 3. Resolve effective skill rating for this category
			const { effectiveSkillRating, ratingSource } = resolveEffectiveSkillRating(
				qType,
				input.userRating,
				input.categoryRatings
			);

			// 4. Resolve distribution: explicit custom config overrides adaptive behavior
			const distribution = isExplicitCustom
				? resolveConfiguredDifficultyDistribution(
						input.config.difficultyDistribution,
						resolveDifficultyDistribution(effectiveSkillRating)
					)
				: resolveDifficultyDistribution(effectiveSkillRating);

			// 5. Generate and shuffle that category's difficulty plan using a derived deterministic RNG seed
			const categoryPlan = expandDifficultyPlan({
				questionCount: slotIndices.length,
				distribution
			});
			const categoryRng = createSeededRng(`${input.seed}:adaptive:${qType}`);
			const shuffledCategoryDifficulties = categoryRng.shuffle(categoryPlan);

			// 6. Assign those difficulty bands and contexts back to the original question slots
			for (let j = 0; j < slotIndices.length; j++) {
				const slotIndex = slotIndices[j]!;
				const difficulty = shuffledCategoryDifficulties[j] as DifficultyBand;
				assignedDifficulties[slotIndex] = difficulty;
				assignedContexts[slotIndex] = {
					questionType: qType,
					effectiveSkillRating,
					ratingSource,
					difficultyBand: difficulty
				};
			}
		}
	}

	const activeRules = input.rules.filter((rule) => rule.isActive);
	const questions: BuiltChallengeQuestion[] = [];

	const seenFingerprints = new Set<string>();
	const usedRuleIds = new Map<string, Set<string>>();
	let lastRuleId: string | null = null;

	for (const category of activeCategories) {
		usedRuleIds.set(category.id, new Set());
	}

	for (let orderIndex = 0; orderIndex < input.config.questionCount; orderIndex += 1) {
		const questionType = requestedTypes[orderIndex] as QuestionType;
		const difficulty = assignedDifficulties[orderIndex] as DifficultyBand;
		const adaptiveContext = assignedContexts[orderIndex]!;
		const category = pickCategory(activeCategories, questionType, rng);
		const rules = activeRules.filter(
			(rule) =>
				rule.categoryId === category.id &&
				rule.questionType === questionType &&
				ruleMatchesDifficulty(rule, difficulty)
		);

		if (rules.length === 0) {
			throw new Error(`No active ${difficulty} ${questionType} rules are available`);
		}

		const categoryUsedRuleIds = usedRuleIds.get(category.id) ?? new Set();

		const question = generateWithRetries({
			locale: input.locale,
			rules,
			questionType,
			categoryId: category.id,
			difficulty,
			seed: `${input.seed}:${orderIndex}`,
			rng,
			seenFingerprints,
			usedRuleIds: categoryUsedRuleIds,
			lastRuleId,
			adaptiveContext
		});

		questions.push(question);
		seenFingerprints.add(question.metadata.fingerprint as string);
		categoryUsedRuleIds.add(question.metadata.ruleId as string);
		lastRuleId = question.metadata.ruleId as string;
	}

	return questions;
}

export function toRuleDefinition(input: {
	id: string;
	categoryId: string;
	ruleType: string;
	difficultyMin: number;
	difficultyMax: number;
	difficultyBand: DifficultyBand | null;
	timeLimitSeconds: number;
	config: Record<string, unknown>;
	isActive: boolean;
}): QuestionRuleDefinition | null {
	const questionType = getQuestionTypeForRuleType(input.ruleType);
	if (!questionType) return null;
	return { ...input, questionType };
}

function generateWithRetries(input: {
	locale?: import('$lib/i18n').Locale;
	rules: QuestionRuleDefinition[];
	questionType: QuestionType;
	categoryId: string;
	difficulty: DifficultyBand;
	seed: string;
	rng: ReturnType<typeof createSeededRng>;
	seenFingerprints: Set<string>;
	usedRuleIds: Set<string>;
	lastRuleId: string | null;
	adaptiveContext?: AdaptiveQuestionContext;
}): BuiltChallengeQuestion {
	const generator = getGeneratorForQuestionType(input.questionType);
	let lastError: unknown = null;

	for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS_PER_QUESTION; attempt += 1) {
		// Filter rules to avoid consecutive duplicates and ensure all are used before reuse
		let availableRules = input.rules.filter(
			(r) => r.id !== input.lastRuleId && !input.usedRuleIds.has(r.id)
		);

		if (availableRules.length === 0) {
			input.usedRuleIds.clear();
			availableRules = input.rules.filter((r) => r.id !== input.lastRuleId);
			if (availableRules.length === 0) {
				availableRules = input.rules; // Fallback if only 1 rule exists
			}
		}

		const rule = input.rng.pick(availableRules);

		try {
			const question = validateGeneratedQuestion(
				generator({
					locale: input.locale,
					seed: `${input.seed}:${attempt}:${rule.id}`,
					difficulty: input.difficulty,
					ruleType: rule.ruleType,
					timeLimitSeconds: rule.timeLimitSeconds,
					config: {
						...rule.config,
						difficultyMin: rule.difficultyMin,
						difficultyMax: rule.difficultyMax
					}
				})
			);

			const fingerprint = JSON.stringify({
				questionType: input.questionType,
				ruleType: rule.ruleType,
				prompt: question.prompt,
				correctAnswer: question.correctAnswer,
				metadata: {
					sequence: question.metadata.sequence,
					pattern: question.metadata.pattern,
					memorize: question.metadata.memorize
				}
			});

			if (input.seenFingerprints.has(fingerprint)) {
				lastError = new Error('Duplicate question generated');
				continue;
			}

			return {
				...question,
				categoryId: input.categoryId,
				metadata: {
					...question.metadata,
					fingerprint,
					ruleId: rule.id,
					adaptiveContext: input.adaptiveContext
				}
			};
		} catch (error) {
			lastError = error;
		}
	}

	throw new Error(
		`Could not generate a valid ${input.questionType} question: ${
			lastError instanceof Error ? lastError.message : 'unknown generator failure'
		}`
	);
}

function resolveQuestionTypePlan(input: {
	questionCount: number;
	config: ChallengeConfigDefinition;
	selectedMode?: QuestionType;
	availableTypes: QuestionType[];
	rng: ReturnType<typeof createSeededRng>;
}): QuestionType[] {
	if (input.selectedMode) {
		if (!input.availableTypes.includes(input.selectedMode)) {
			throw new Error(`Selected mode is not available: ${input.selectedMode}`);
		}
		return Array<QuestionType>(input.questionCount).fill(input.selectedMode);
	}

	const distribution = normalizeModeDistribution(
		input.config.modeDistribution,
		input.availableTypes,
		input.questionCount
	);
	const expanded = Object.entries(distribution).flatMap(([type, count]) =>
		Array<QuestionType>(count).fill(type as QuestionType)
	);

	return input.rng.shuffle(expanded).slice(0, input.questionCount);
}

function normalizeModeDistribution(
	distribution: Record<string, unknown> | null,
	availableTypes: QuestionType[],
	questionCount: number
): Record<QuestionType, number> {
	if (availableTypes.length === 0) throw new Error('At least one active category is required');

	const weights = new Map<QuestionType, number>();
	for (const questionType of availableTypes) {
		const rawWeight = distribution?.[questionType];
		const weight = typeof rawWeight === 'number' && rawWeight > 0 ? rawWeight : 1;
		weights.set(questionType, weight);
	}

	const totalWeight = [...weights.values()].reduce((sum, weight) => sum + weight, 0);
	const counts = new Map<QuestionType, number>();
	let assigned = 0;

	for (const [questionType, weight] of weights) {
		const count = Math.max(1, Math.floor((weight / totalWeight) * questionCount));
		counts.set(questionType, count);
		assigned += count;
	}

	while (assigned < questionCount) {
		const questionType = availableTypes[assigned % availableTypes.length] as QuestionType;
		counts.set(questionType, (counts.get(questionType) ?? 0) + 1);
		assigned += 1;
	}

	return Object.fromEntries(counts) as Record<QuestionType, number>;
}

function resolveConfiguredDifficultyDistribution(
	configured: Record<string, unknown> | null,
	fallback: DifficultyDistribution
): DifficultyDistribution {
	const resolved = { ...fallback };
	for (const difficulty of DIFFICULTY_BANDS) {
		const value = configured?.[difficulty];
		if (typeof value === 'number' && value >= 0) resolved[difficulty] = value;
	}
	return resolved;
}

function pickCategory(
	categories: ChallengeCategoryDefinition[],
	questionType: QuestionType,
	rng: ReturnType<typeof createSeededRng>
): ChallengeCategoryDefinition {
	const matches = categories.filter((category) => category.questionType === questionType);
	if (matches.length === 0) throw new Error(`No active category for ${questionType}`);
	return rng.pick(matches);
}

function ruleMatchesDifficulty(rule: QuestionRuleDefinition, difficulty: DifficultyBand): boolean {
	return rule.difficultyBand === null || rule.difficultyBand === difficulty;
}

function validateBuildInput(input: ChallengeBuildInput): void {
	if (!Number.isInteger(input.config.questionCount) || input.config.questionCount <= 0) {
		throw new Error('questionCount must be positive');
	}
	if (input.seed.trim().length === 0) throw new Error('seed is required');
	if (input.selectedMode && !QUESTION_TYPES.includes(input.selectedMode)) {
		throw new Error('selectedMode is invalid');
	}
}
