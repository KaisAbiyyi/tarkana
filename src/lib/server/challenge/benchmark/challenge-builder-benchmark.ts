import { buildChallengeQuestions } from '$lib/server/challenge/challenge-builder';
import type {
	ChallengeConfigDefinition,
	QuestionRuleDefinition,
	ChallengeCategoryDefinition
} from '$lib/server/challenge/types';
import { getRuleInventory } from '$lib/server/challenge/generators/registry';
import { computeLatencyPercentiles } from '$lib/server/challenge/benchmark/generator-benchmark';
import type { LatencyPercentiles } from '$lib/server/challenge/benchmark/types';

export type ChallengeBuilderBenchmarkResult = {
	challengeType: string;
	questionCount: number;
	sampleCount: number;
	failures: number;
	observedFailureRatePct: number;
	formattedResult: string;
	latency: LatencyPercentiles;
};

export function runChallengeBuilderBenchmark(iterationsPerConfig = 20): {
	results: ChallengeBuilderBenchmarkResult[];
	summaryStatement: string;
} {
	const inventory = getRuleInventory();

	// Construct active rule definitions covering all dynamic rules
	const rules: QuestionRuleDefinition[] = inventory.flatMap((item, idx) => [
		{
			id: `rule-${item.ruleType}-easy-${idx}`,
			categoryId: `cat-${item.questionType}`,
			questionType: item.questionType,
			ruleType: item.ruleType,
			difficultyMin: 0,
			difficultyMax: 1000,
			difficultyBand: 'easy',
			timeLimitSeconds: 30,
			config: {},
			isActive: true
		},
		{
			id: `rule-${item.ruleType}-med-${idx}`,
			categoryId: `cat-${item.questionType}`,
			questionType: item.questionType,
			ruleType: item.ruleType,
			difficultyMin: 800,
			difficultyMax: 1600,
			difficultyBand: 'medium',
			timeLimitSeconds: 30,
			config: {},
			isActive: true
		},
		{
			id: `rule-${item.ruleType}-hard-${idx}`,
			categoryId: `cat-${item.questionType}`,
			questionType: item.questionType,
			ruleType: item.ruleType,
			difficultyMin: 1400,
			difficultyMax: 3000,
			difficultyBand: 'hard',
			timeLimitSeconds: 45,
			config: {},
			isActive: true
		}
	]);

	const categories: ChallengeCategoryDefinition[] = [
		{
			id: 'cat-number_sequence',
			questionType: 'number_sequence',
			slug: 'number-sequence',
			isActive: true
		},
		{
			id: 'cat-symbol_pattern',
			questionType: 'symbol_pattern',
			slug: 'symbol-pattern',
			isActive: true
		},
		{
			id: 'cat-mini_deduction',
			questionType: 'mini_deduction',
			slug: 'mini-deduction',
			isActive: true
		},
		{
			id: 'cat-memory_pattern',
			questionType: 'memory_pattern',
			slug: 'memory-pattern',
			isActive: true
		}
	];

	// Configurations that actively generate questions (excluding duel which replays snapshots)
	const configsToTest: Array<{
		name: string;
		config: ChallengeConfigDefinition;
		ratings: number[];
		selectedMode?: 'number_sequence' | 'symbol_pattern' | 'mini_deduction' | 'memory_pattern';
	}> = [
		{
			name: 'quick',
			config: {
				name: 'Quick Challenge',
				challengeType: 'quick',
				questionCount: 5,
				modeDistribution: null,
				difficultyDistribution: null,
				isActive: true
			},
			ratings: [800, 1200, 1800]
		},
		{
			name: 'standard',
			config: {
				name: 'Standard Challenge',
				challengeType: 'standard',
				questionCount: 10,
				modeDistribution: null,
				difficultyDistribution: null,
				isActive: true
			},
			ratings: [800, 1400, 2100]
		},
		{
			name: 'long',
			config: {
				name: 'Long Challenge',
				challengeType: 'long',
				questionCount: 20,
				modeDistribution: null,
				difficultyDistribution: null,
				isActive: true
			},
			ratings: [1000, 1500]
		},
		{
			name: 'mode_number_sequence',
			config: {
				name: 'Number Sequence Mode',
				challengeType: 'mode',
				questionCount: 10,
				modeDistribution: null,
				difficultyDistribution: null,
				isActive: true
			},
			ratings: [1200],
			selectedMode: 'number_sequence'
		},
		{
			name: 'mode_mini_deduction',
			config: {
				name: 'Mini Deduction Mode',
				challengeType: 'mode',
				questionCount: 10,
				modeDistribution: null,
				difficultyDistribution: null,
				isActive: true
			},
			ratings: [1200],
			selectedMode: 'mini_deduction'
		}
	];

	const results: ChallengeBuilderBenchmarkResult[] = [];
	let totalSamples = 0;
	let totalFailures = 0;

	for (const testCase of configsToTest) {
		const latencies: number[] = [];
		let failures = 0;

		for (let i = 0; i < iterationsPerConfig; i++) {
			const rating = testCase.ratings[i % testCase.ratings.length]!;
			const seed = `bench-builder-${testCase.name}-${rating}-${i}`;

			const start = performance.now();
			try {
				const questions = buildChallengeQuestions({
					config: testCase.config,
					categories,
					rules,
					userRating: rating,
					selectedMode: testCase.selectedMode,
					seed
				});

				if (questions.length !== testCase.config.questionCount) {
					failures++;
					continue;
				}

				// Check fingerprint uniqueness
				const fingerprints = new Set(questions.map((q) => q.metadata.fingerprint as string));
				if (fingerprints.size !== questions.length) {
					failures++;
					continue;
				}
			} catch {
				failures++;
			}
			latencies.push(performance.now() - start);
		}

		totalSamples += iterationsPerConfig;
		totalFailures += failures;

		const failureRate = (failures / iterationsPerConfig) * 100;
		results.push({
			challengeType: testCase.name,
			questionCount: testCase.config.questionCount,
			sampleCount: iterationsPerConfig,
			failures,
			observedFailureRatePct: Number(failureRate.toFixed(2)),
			formattedResult: `${failures} failures in ${iterationsPerConfig} challenge builds (observed rate: ${failureRate.toFixed(2)}%)`,
			latency: computeLatencyPercentiles(latencies)
		});
	}

	const overallRate = totalSamples > 0 ? (totalFailures / totalSamples) * 100 : 0;
	return {
		results,
		summaryStatement: `${totalFailures} failures in ${totalSamples} challenge builds across ${configsToTest.length} configurations (observed rate: ${overallRate.toFixed(2)}%)`
	};
}
