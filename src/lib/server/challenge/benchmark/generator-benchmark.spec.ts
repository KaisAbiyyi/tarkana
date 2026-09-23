import { describe, expect, it } from 'vitest';
import {
	getRuleInventory,
	getAllRuleTypes,
	RULES_BY_QUESTION_TYPE
} from '$lib/server/challenge/generators/registry';
import {
	runGeneratorBenchmark,
	computeLatencyPercentiles
} from '$lib/server/challenge/benchmark/generator-benchmark';
import { verifySemanticInvariants } from '$lib/server/challenge/benchmark/semantic-oracles';
import { runChallengeBuilderBenchmark } from '$lib/server/challenge/benchmark/challenge-builder-benchmark';
import {
	runDailyChallengeBenchmark,
	runDuelSnapshotReplayBenchmark
} from '$lib/server/challenge/benchmark/daily-and-duel-benchmark';
import type { GeneratedQuestion } from '$lib/server/challenge/types';

describe('P1.8 Generator Benchmarks & Integrity Suite', () => {
	describe('Dynamic Rule Inventory', () => {
		it('derives rule inventory dynamically from registries without hardcoding counts', () => {
			const inventory = getRuleInventory();
			const ruleTypes = getAllRuleTypes();

			const expectedTotal =
				RULES_BY_QUESTION_TYPE.number_sequence.length +
				RULES_BY_QUESTION_TYPE.symbol_pattern.length +
				RULES_BY_QUESTION_TYPE.mini_deduction.length +
				RULES_BY_QUESTION_TYPE.memory_pattern.length;

			expect(inventory.length).toBe(expectedTotal);
			expect(ruleTypes.length).toBe(expectedTotal);
			expect(new Set(ruleTypes).size).toBe(expectedTotal);

			for (const item of inventory) {
				expect(item.ruleType).toBeTruthy();
				expect(item.questionType).toBeTruthy();
				expect(typeof item.generator).toBe('function');
			}
		});
	});

	describe('Semantic Oracles', () => {
		it('detects violations when arithmetic invariant is corrupted', () => {
			const mockQuestion: GeneratedQuestion = {
				questionType: 'number_sequence',
				prompt: 'What comes next in the sequence?',
				choices: ['2', '4', '6', '10'],
				correctAnswer: '10',
				explanation: 'Arithmetic step',
				difficultyScore: 1000,
				timeLimitSeconds: 30,
				metadata: {
					ruleType: 'arithmetic_sequence',
					sequence: [2, 4, 6, '?'] // step 2, but correct answer 10 makes step 4!
				},
				generatedSeed: 'test-seed-1'
			};

			const result = verifySemanticInvariants(mockQuestion);
			expect(result.passed).toBe(false);
			expect(result.reason).toContain('Arithmetic step invariant violated');
		});

		it('detects violations when square number invariant is corrupted', () => {
			const mockQuestion: GeneratedQuestion = {
				questionType: 'number_sequence',
				prompt: 'What comes next in the sequence?',
				choices: ['1', '4', '9', '17'],
				correctAnswer: '17',
				explanation: 'Square numbers',
				difficultyScore: 1200,
				timeLimitSeconds: 30,
				metadata: {
					ruleType: 'square_number',
					sequence: [1, 4, 9, '?'] // 17 is not an exact square
				},
				generatedSeed: 'test-seed-2'
			};

			const result = verifySemanticInvariants(mockQuestion);
			expect(result.passed).toBe(false);
			expect(result.reason).toContain('exact squares');
		});

		it('detects missing correct answer in choices for mini_deduction', () => {
			const mockQuestion: GeneratedQuestion = {
				questionType: 'mini_deduction',
				prompt: 'Who has the red hat based on clues?',
				choices: ['Alice', 'Bob', 'Charlie'],
				correctAnswer: 'Dave', // Dave is not in choices!
				explanation: 'By deduction Dave has red hat',
				difficultyScore: 1100,
				timeLimitSeconds: 30,
				metadata: {
					ruleType: 'ordering_clues'
				},
				generatedSeed: 'test-seed-3'
			};

			const result = verifySemanticInvariants(mockQuestion);
			expect(result.passed).toBe(false);
			expect(result.reason).toContain('is not present in choices');
		});
	});

	describe('Generator Benchmark Harness', () => {
		it('executes across all dynamic rules and difficulties with 0 structural, semantic, or replay errors', () => {
			// Run a bounded sample across all combinations in unit test
			const summary = runGeneratorBenchmark({
				iterationsPerCombination: 5,
				includeSemanticOracles: true,
				seedPrefix: 'unit-test-bench'
			});

			expect(summary.totalSamples).toBeGreaterThan(0);
			expect(summary.overallStructuralFailures).toBe(0);
			expect(summary.overallSemanticFailures).toBe(0);
			expect(summary.overallReconstructionMismatches).toBe(0);
			expect(summary.overallObservedFailureRatePct).toBe(0);
			expect(summary.summaryStatement).toContain('0 failures in');
			expect(summary.summaryStatement).toContain('observed rate: 0.00%');

			// Latency assertions with generous CI regression threshold
			expect(summary.aggregateLatency.avgMs).toBeLessThan(50); // Generous 50ms guardrail
			expect(summary.aggregateLatency.maxMs).toBeLessThan(300); // Generous 300ms spike guardrail
			expect(summary.aggregateLatency.minMs).toBeGreaterThanOrEqual(0);

			for (const res of summary.results) {
				expect(res.observedFailureRatePct).toBe(0);
				expect(res.formattedResult).toContain('0 failures in 5 generated samples');
				expect(res.sampleErrors).toHaveLength(0);
			}
		});

		it('computes latency percentiles correctly', () => {
			const latencies = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
			const p = computeLatencyPercentiles(latencies);
			expect(p.minMs).toBe(1);
			expect(p.maxMs).toBe(10);
			expect(p.avgMs).toBe(5.5);
			expect(p.p50Ms).toBe(6);
			expect(p.p90Ms).toBe(10);
		});
	});

	describe('Challenge Builder Benchmark', () => {
		it('builds challenges across all active configs with 0 failures and unique fingerprints', () => {
			const report = runChallengeBuilderBenchmark(5);

			expect(report.results.length).toBeGreaterThan(0);
			for (const res of report.results) {
				expect(res.failures).toBe(0);
				expect(res.observedFailureRatePct).toBe(0);
				expect(res.formattedResult).toContain('0 failures in 5 challenge builds');
			}
			expect(report.summaryStatement).toContain('0 failures');
		});
	});

	describe('Daily & Duel Snapshot Replay Integrity', () => {
		it('generates deterministic daily puzzle snapshots with identical secrets across dates', () => {
			const dailyReport = runDailyChallengeBenchmark(5);

			expect(dailyReport.failures).toBe(0);
			expect(dailyReport.reconstructionMismatches).toBe(0);
			expect(dailyReport.observedFailureRatePct).toBe(0);
			expect(dailyReport.formattedResult).toContain('0 failures in 5 daily snapshot generations');
		});

		it('verifies duel snapshot replay preserves 100% question fidelity', () => {
			const duelReport = runDuelSnapshotReplayBenchmark(5);

			expect(duelReport.replayMismatches).toBe(0);
			expect(duelReport.observedFailureRatePct).toBe(0);
			expect(duelReport.formattedResult).toContain('0 mismatches in');
		});
	});
});
