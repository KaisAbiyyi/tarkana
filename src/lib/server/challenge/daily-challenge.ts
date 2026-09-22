import { createHmac } from 'node:crypto';
import {
	DEFAULT_CHALLENGE_QUESTION_COUNTS,
	type QuestionType
} from '$lib/shared/constants/challenge';
import { buildChallengeQuestions, toRuleDefinition } from '$lib/server/challenge/challenge-builder';
import type {
	ChallengeCategoryDefinition,
	ChallengeConfigDefinition,
	QuestionRuleDefinition
} from '$lib/server/challenge/types';
import type { Category, DailyPuzzleSnapshotQuestion, QuestionRule } from '$lib/server/db/schema';

export const DAILY_CHALLENGE_CONFIG_VERSION = 1;
export const DAILY_CHALLENGE_GENERATOR_VERSION = 1;
export const DAILY_CHALLENGE_QUESTION_COUNT = DEFAULT_CHALLENGE_QUESTION_COUNTS.daily ?? 10;

/**
 * Standard difficulty distribution for daily challenge:
 * Fixed across all players globally so every player experiences
 * the exact same difficulty curve regardless of individual user rating.
 */
export const DAILY_CHALLENGE_DIFFICULTY_DISTRIBUTION = {
	easy: 30,
	medium: 40,
	hard: 30
} as const;

/**
 * Balanced question type distribution across all 4 logic categories.
 */
export const DAILY_CHALLENGE_MODE_DISTRIBUTION: Record<QuestionType, number> = {
	number_sequence: 2,
	symbol_pattern: 3,
	mini_deduction: 3,
	memory_pattern: 2
};

/**
 * Canonical secret fallback for development and local testing.
 * Production must set DAILY_CHALLENGE_SECRET in environment variables.
 */
const DEFAULT_DAILY_SECRET = 'tarkana_daily_challenge_secret_fallback_key_2026';

/**
 * Generates an unguessable canonical seed server-side using HMAC-SHA256.
 * Incorporates secret, UTC date string, configVersion, and generatorVersion.
 */
export function generateCanonicalDailySeed(
	dateString: string,
	configVersion = DAILY_CHALLENGE_CONFIG_VERSION,
	generatorVersion = DAILY_CHALLENGE_GENERATOR_VERSION,
	secret = process.env.DAILY_CHALLENGE_SECRET || DEFAULT_DAILY_SECRET
): string {
	return createHmac('sha256', secret)
		.update(`tarkana:daily:${dateString}:cfg${configVersion}:gen${generatorVersion}`)
		.digest('hex');
}

/**
 * Returns current UTC date string in 'YYYY-MM-DD' format.
 */
export function getUtcDateString(date: Date = new Date()): string {
	return date.toISOString().slice(0, 10);
}

/**
 * Returns remaining seconds until next 00:00:00 UTC midnight boundary.
 */
export function getSecondsUntilNextUtcMidnight(now: Date = new Date()): number {
	const nextMidnight = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0)
	);
	return Math.max(0, Math.floor((nextMidnight.getTime() - now.getTime()) / 1000));
}

export interface GenerateDailySnapshotInput {
	dateString: string;
	categories: Category[];
	rules: QuestionRule[];
	configVersion?: number;
	generatorVersion?: number;
	secret?: string;
}

export interface GeneratedDailySnapshot {
	challengeDate: string;
	configVersion: number;
	generatorVersion: number;
	seed: string;
	totalQuestions: number;
	puzzleSnapshot: DailyPuzzleSnapshotQuestion[];
}

/**
 * Generates the immutable puzzle snapshot for a calendar date.
 * Puzzle generation is invariant to player locale, user rating, or browser timezone.
 */
export function generateDailyPuzzleSnapshot(
	input: GenerateDailySnapshotInput
): GeneratedDailySnapshot {
	const configVersion = input.configVersion ?? DAILY_CHALLENGE_CONFIG_VERSION;
	const generatorVersion = input.generatorVersion ?? DAILY_CHALLENGE_GENERATOR_VERSION;
	const seed = generateCanonicalDailySeed(
		input.dateString,
		configVersion,
		generatorVersion,
		input.secret
	);

	const ruleDefinitions = input.rules
		.map(toRuleDefinition)
		.filter((r): r is QuestionRuleDefinition => r !== null);

	const categoryDefinitions = toChallengeCategories(input.categories, ruleDefinitions);

	const challengeConfig: ChallengeConfigDefinition = {
		name: `Daily Challenge ${input.dateString}`,
		challengeType: 'daily',
		questionCount: DAILY_CHALLENGE_QUESTION_COUNT,
		modeDistribution: DAILY_CHALLENGE_MODE_DISTRIBUTION,
		difficultyDistribution: DAILY_CHALLENGE_DIFFICULTY_DISTRIBUTION,
		isActive: true
	};

	// Use canonical 'en' locale for snapshot generation to ensure worldwide determinism
	const builtQuestions = buildChallengeQuestions({
		locale: 'en',
		config: challengeConfig,
		categories: categoryDefinitions,
		rules: ruleDefinitions,
		userRating: 0,
		seed
	});

	const puzzleSnapshot: DailyPuzzleSnapshotQuestion[] = builtQuestions.map((q, orderIndex) => ({
		orderIndex,
		categoryId: q.categoryId,
		questionType: q.questionType,
		prompt: q.prompt,
		choices: q.choices,
		correctAnswer: q.correctAnswer,
		explanation: q.explanation,
		difficultyScore: q.difficultyScore,
		timeLimitSeconds: q.timeLimitSeconds,
		metadata: q.metadata,
		// Opaque client-facing seed token: raw HMAC seed is never exposed
		generatedSeed: `daily:${input.dateString}:${orderIndex}`
	}));

	return {
		challengeDate: input.dateString,
		configVersion,
		generatorVersion,
		seed,
		totalQuestions: puzzleSnapshot.length,
		puzzleSnapshot
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
