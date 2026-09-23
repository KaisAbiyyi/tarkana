import { DIFFICULTY_BANDS, type DifficultyBand } from '$lib/shared/constants/challenge';
import { getRuleInventory } from '$lib/server/challenge/generators/registry';
import { getGeneratedQuestionErrors } from '$lib/server/challenge/rule-validator';
import { normalizeAnswer } from '$lib/server/challenge/normalization';
import { verifySemanticInvariants } from '$lib/server/challenge/benchmark/semantic-oracles';
import type {
	BenchmarkRunOptions,
	BenchmarkSummary,
	LatencyPercentiles,
	RuleBenchmarkResult
} from '$lib/server/challenge/benchmark/types';
import type { GeneratedQuestion } from '$lib/server/challenge/types';

export function runGeneratorBenchmark(options: BenchmarkRunOptions = {}): BenchmarkSummary {
	const iterations = options.iterationsPerCombination ?? 50;
	const seedPrefix = options.seedPrefix ?? 'bench';
	const difficulties: DifficultyBand[] = options.difficulties ?? [...DIFFICULTY_BANDS];
	const locales: Array<'en' | 'id'> = options.locales ?? ['en'];
	const includeSemantic = options.includeSemanticOracles ?? true;

	const inventory = getRuleInventory();
	const activeRules = options.rules
		? inventory.filter((item) => options.rules!.includes(item.ruleType))
		: inventory;

	const allResults: RuleBenchmarkResult[] = [];
	const allLatencies: number[] = [];

	let totalStructural = 0;
	let totalSemantic = 0;
	let totalReconstruction = 0;
	let totalSamples = 0;

	for (const ruleItem of activeRules) {
		for (const difficulty of difficulties) {
			const latencies: number[] = [];
			const sampleErrors: RuleBenchmarkResult['sampleErrors'] = [];
			let structuralFailures = 0;
			let semanticFailures = 0;
			let reconstructionMismatches = 0;
			let duplicateChoiceAnomalies = 0;
			let ambiguousChoiceAnomalies = 0;

			for (let i = 0; i < iterations; i++) {
				const locale = locales[i % locales.length]!;
				const seed = `${seedPrefix}-${ruleItem.ruleType}-${difficulty}-${locale}-${i}`;

				const input = {
					seed,
					difficulty,
					ruleType: ruleItem.ruleType,
					timeLimitSeconds: 30,
					locale
				};

				const start = performance.now();
				let question: GeneratedQuestion;
				try {
					question = ruleItem.generator(input);
				} catch (err: unknown) {
					structuralFailures++;
					sampleErrors.push({
						seed,
						errorType: 'structural',
						message: err instanceof Error ? err.message : String(err)
					});
					continue;
				}
				const elapsed = performance.now() - start;
				latencies.push(elapsed);
				allLatencies.push(elapsed);

				// 1. Structural integrity check
				const errors = getGeneratedQuestionErrors(question);
				if (errors.length > 0) {
					structuralFailures++;
					sampleErrors.push({
						seed,
						errorType: 'structural',
						message: errors.join('; ')
					});
				}

				// 2. Choice uniqueness & ambiguity checks
				const exactSymbols = question.questionType === 'symbol_pattern';
				const normalizedChoices = question.choices.map((c) => normalizeAnswer(c, { exactSymbols }));
				if (new Set(normalizedChoices).size !== question.choices.length) {
					duplicateChoiceAnomalies++;
					sampleErrors.push({
						seed,
						errorType: 'choice',
						message: 'Duplicate normalized choices detected'
					});
				}

				const correctNormalized = normalizeAnswer(question.correctAnswer, { exactSymbols });
				const matchCount = normalizedChoices.filter((c) => c === correctNormalized).length;
				if (matchCount !== 1) {
					ambiguousChoiceAnomalies++;
					sampleErrors.push({
						seed,
						errorType: 'choice',
						message: `Expected 1 match for correct answer, found ${matchCount}`
					});
				}

				// 3. Semantic invariants oracle
				if (includeSemantic) {
					const semanticResult = verifySemanticInvariants(question);
					if (!semanticResult.passed) {
						semanticFailures++;
						sampleErrors.push({
							seed,
							errorType: 'semantic',
							message: semanticResult.reason ?? 'Semantic invariant violation'
						});
					}
				}

				// 4. Deterministic reconstruction check (deep equality on identical input)
				try {
					const reconstructed = ruleItem.generator(input);
					if (!isDeepEqual(question, reconstructed)) {
						reconstructionMismatches++;
						sampleErrors.push({
							seed,
							errorType: 'reconstruction',
							message: 'Reconstructed question did not deeply equal original for identical seed'
						});
					}
				} catch (replayErr: unknown) {
					reconstructionMismatches++;
					sampleErrors.push({
						seed,
						errorType: 'reconstruction',
						message: `Replay failed: ${replayErr instanceof Error ? replayErr.message : String(replayErr)}`
					});
				}
			}

			const totalFailures =
				structuralFailures +
				semanticFailures +
				reconstructionMismatches +
				duplicateChoiceAnomalies +
				ambiguousChoiceAnomalies;
			const failureRate = (totalFailures / iterations) * 100;

			totalStructural += structuralFailures;
			totalSemantic += semanticFailures;
			totalReconstruction += reconstructionMismatches;
			totalSamples += iterations;

			const latencyPercentiles = computeLatencyPercentiles(latencies);

			allResults.push({
				ruleType: ruleItem.ruleType,
				questionType: ruleItem.questionType,
				difficulty,
				sampleCount: iterations,
				structuralFailures,
				semanticFailures,
				reconstructionMismatches,
				duplicateChoiceAnomalies,
				ambiguousChoiceAnomalies,
				observedFailureRatePct: Number(failureRate.toFixed(2)),
				formattedResult: `${totalFailures} failures in ${iterations} generated samples (observed rate: ${failureRate.toFixed(2)}%)`,
				latency: latencyPercentiles,
				sampleErrors
			});
		}
	}

	const overallFailures = totalStructural + totalSemantic + totalReconstruction;
	const overallFailureRate = totalSamples > 0 ? (overallFailures / totalSamples) * 100 : 0;
	const aggregateLatency = computeLatencyPercentiles(allLatencies);

	return {
		runtime: {
			nodeVersion: process.version,
			platform: process.platform,
			arch: process.arch,
			timestamp: new Date().toISOString(),
			commitSha: process.env.GITHUB_SHA || process.env.GIT_COMMIT || 'local',
			generatorVersion: '1.0.0'
		},
		totalSamples,
		totalRuleCombinations: allResults.length,
		overallStructuralFailures: totalStructural,
		overallSemanticFailures: totalSemantic,
		overallReconstructionMismatches: totalReconstruction,
		overallObservedFailureRatePct: Number(overallFailureRate.toFixed(2)),
		summaryStatement: `${overallFailures} failures in ${totalSamples} generated samples across ${allResults.length} rule combinations (observed rate: ${overallFailureRate.toFixed(2)}%)`,
		aggregateLatency,
		results: allResults
	};
}

export function computeLatencyPercentiles(times: number[]): LatencyPercentiles {
	if (times.length === 0) {
		return { minMs: 0, p50Ms: 0, p90Ms: 0, p95Ms: 0, p99Ms: 0, maxMs: 0, avgMs: 0 };
	}

	const sorted = [...times].sort((a, b) => a - b);
	const total = sorted.reduce((sum, t) => sum + t, 0);

	const percentile = (p: number) => {
		const index = Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1);
		return Number(sorted[index]!.toFixed(3));
	};

	return {
		minMs: Number(sorted[0]!.toFixed(3)),
		p50Ms: percentile(50),
		p90Ms: percentile(90),
		p95Ms: percentile(95),
		p99Ms: percentile(99),
		maxMs: Number(sorted[sorted.length - 1]!.toFixed(3)),
		avgMs: Number((total / sorted.length).toFixed(3))
	};
}

function isDeepEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true;
	if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
		return false;
	}

	const objA = a as Record<string, unknown>;
	const objB = b as Record<string, unknown>;

	const keysA = Object.keys(objA);
	const keysB = Object.keys(objB);

	if (keysA.length !== keysB.length) return false;

	for (const key of keysA) {
		if (!Object.prototype.hasOwnProperty.call(objB, key)) return false;
		if (!isDeepEqual(objA[key], objB[key])) return false;
	}

	return true;
}
