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
	runSyntheticDuelDtoReplayBenchmark
} from '$lib/server/challenge/benchmark/daily-and-duel-benchmark';
import type { GeneratedQuestion } from '$lib/server/challenge/types';

describe('P1.8.1 Generator Benchmarks & Integrity Suite', () => {
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

	describe('Semantic Oracles - Strict Failure on Unknowns', () => {
		it('fails loudly when question type is unknown', () => {
			const mockQuestion = {
				questionType: 'quantum_logic' as unknown as 'number_sequence',
				prompt: 'Unknown',
				choices: ['A', 'B'],
				correctAnswer: 'A',
				explanation: 'N/A',
				difficultyScore: 100,
				timeLimitSeconds: 30,
				metadata: { ruleType: 'quantum_superposition' },
				generatedSeed: 'seed-q'
			} as GeneratedQuestion;

			const result = verifySemanticInvariants(mockQuestion);
			expect(result.passed).toBe(false);
			expect(result.reason).toContain(
				"Unimplemented or unrecognized question category 'quantum_logic'"
			);
		});

		it('fails loudly when number_sequence rule is unknown', () => {
			const mockQuestion: GeneratedQuestion = {
				questionType: 'number_sequence',
				prompt: 'Unknown rule',
				choices: ['1', '2', '3', '4'],
				correctAnswer: '4',
				explanation: 'N/A',
				difficultyScore: 100,
				timeLimitSeconds: 30,
				metadata: { ruleType: 'unknown_number_rule', sequence: [1, 2, 3, '?'] },
				generatedSeed: 'seed-num'
			};

			const result = verifySemanticInvariants(mockQuestion);
			expect(result.passed).toBe(false);
			expect(result.reason).toContain(
				"Unknown or unimplemented number sequence rule 'unknown_number_rule'"
			);
		});

		it('fails loudly when symbol_pattern rule is unknown', () => {
			const mockQuestion: GeneratedQuestion = {
				questionType: 'symbol_pattern',
				prompt: 'Unknown rule',
				choices: ['star', 'circle', 'square', 'diamond'],
				correctAnswer: 'star',
				explanation: 'N/A',
				difficultyScore: 100,
				timeLimitSeconds: 30,
				metadata: {
					ruleType: 'unknown_symbol_rule',
					pattern: ['circle', 'square', 'diamond', 'triangle', 'hex']
				},
				generatedSeed: 'seed-sym'
			};

			const result = verifySemanticInvariants(mockQuestion);
			expect(result.passed).toBe(false);
			expect(result.reason).toContain(
				"Unknown or unimplemented symbol pattern rule 'unknown_symbol_rule'"
			);
		});

		it('fails loudly when memory_pattern rule is unknown', () => {
			const mockQuestion: GeneratedQuestion = {
				questionType: 'memory_pattern',
				prompt: 'Unknown rule',
				choices: ['circle', 'square'],
				correctAnswer: 'circle',
				explanation: 'N/A',
				difficultyScore: 100,
				timeLimitSeconds: 30,
				metadata: {
					ruleType: 'unknown_memory_rule',
					memorize: ['circle', 'square', 'triangle', 'star', 'hex'],
					difficulty: 'easy',
					revealSeconds: 4
				},
				generatedSeed: 'seed-mem'
			};

			const result = verifySemanticInvariants(mockQuestion);
			expect(result.passed).toBe(false);
			expect(result.reason).toContain(
				"Unknown or unimplemented memory pattern rule 'unknown_memory_rule'"
			);
		});

		it('fails loudly when mini_deduction rule is unknown', () => {
			const mockQuestion: GeneratedQuestion = {
				questionType: 'mini_deduction',
				prompt: 'Who has the key to the chest?',
				choices: ['Ari', 'Bima'],
				correctAnswer: 'Ari',
				explanation: 'Valid explanation',
				difficultyScore: 100,
				timeLimitSeconds: 30,
				metadata: {
					ruleType: 'unknown_deduction_rule',
					deductionTarget: 'Ari',
					entities: ['Ari', 'Bima']
				},
				generatedSeed: 'seed-ded'
			};

			const result = verifySemanticInvariants(mockQuestion);
			expect(result.passed).toBe(false);
			expect(result.reason).toContain(
				"Unknown or unimplemented mini deduction rule 'unknown_deduction_rule'"
			);
		});
	});

	describe('Semantic Oracles - Number Sequence Recurrence Checks', () => {
		it('verifies alternating_sequence recurrence for both additive and multiplicative patterns', () => {
			// Additive alternating: +5, -2, +5, -2, +5 -> [2, 7, 5, 10, 8, 13]
			const validAdditive: GeneratedQuestion = {
				questionType: 'number_sequence',
				prompt: 'Next number',
				choices: ['10', '12', '13', '15'],
				correctAnswer: '13',
				explanation: 'Alt pattern',
				difficultyScore: 1000,
				timeLimitSeconds: 30,
				metadata: {
					ruleType: 'alternating_sequence',
					sequence: [2, 7, 5, 10, 8, '?']
				},
				generatedSeed: 'seed-alt-add'
			};
			expect(verifySemanticInvariants(validAdditive).passed).toBe(true);

			// Multiplicative alternating: *3, +2, *3, +2, *3 -> [2, 6, 8, 24, 26, 78]
			const validMultiplicative: GeneratedQuestion = {
				questionType: 'number_sequence',
				prompt: 'Next number',
				choices: ['70', '74', '78', '80'],
				correctAnswer: '78',
				explanation: 'Mult alt pattern',
				difficultyScore: 1000,
				timeLimitSeconds: 30,
				metadata: {
					ruleType: 'alternating_sequence',
					sequence: [2, 6, 8, 24, 26, '?']
				},
				generatedSeed: 'seed-alt-mult'
			};
			expect(verifySemanticInvariants(validMultiplicative).passed).toBe(true);

			// Corrupted alternating sequence
			const corruptedAlt: GeneratedQuestion = {
				...validAdditive,
				correctAnswer: '99',
				metadata: {
					ruleType: 'alternating_sequence',
					sequence: [2, 7, 5, 10, 8, '?']
				}
			};
			const failResult = verifySemanticInvariants(corruptedAlt);
			expect(failResult.passed).toBe(false);
			expect(failResult.reason).toContain('Alternating recurrence violated');
		});

		it('verifies increasing_difference constant positive second difference', () => {
			// Sequence: [1, 2, 4, 7, 11, 16] (first diffs: 1, 2, 3, 4, 5; second diff: 1)
			const validIncreasing: GeneratedQuestion = {
				questionType: 'number_sequence',
				prompt: 'Next number',
				choices: ['15', '16', '17', '18'],
				correctAnswer: '16',
				explanation: 'Increasing diff',
				difficultyScore: 1000,
				timeLimitSeconds: 30,
				metadata: {
					ruleType: 'increasing_difference',
					sequence: [1, 2, 4, 7, 11, '?']
				},
				generatedSeed: 'seed-inc'
			};
			expect(verifySemanticInvariants(validIncreasing).passed).toBe(true);

			// Corrupted second difference: [1, 2, 4, 7, 11, 20]
			const corruptedIncreasing: GeneratedQuestion = {
				...validIncreasing,
				correctAnswer: '20'
			};
			const failResult = verifySemanticInvariants(corruptedIncreasing);
			expect(failResult.passed).toBe(false);
			expect(failResult.reason).toContain('Increasing difference invariant violated');
		});
	});

	describe('Semantic Oracles - Symbol Pattern Contracts', () => {
		it('verifies mirrored_sequence palindrome and reflection invariants', () => {
			// Palindrome: [A, B, C, C, B, A]
			const palindrome: GeneratedQuestion = {
				questionType: 'symbol_pattern',
				prompt: 'Next symbol',
				choices: ['circle', 'square', 'star', 'diamond'],
				correctAnswer: 'circle',
				explanation: 'Mirrored',
				difficultyScore: 1000,
				timeLimitSeconds: 30,
				metadata: {
					ruleType: 'mirrored_sequence',
					pattern: ['circle', 'square', 'star', 'star', 'square']
				},
				generatedSeed: 'seed-mir'
			};
			expect(verifySemanticInvariants(palindrome).passed).toBe(true);

			// Center reflection: [A, B, C, D, C, B]
			const centerReflected: GeneratedQuestion = {
				questionType: 'symbol_pattern',
				prompt: 'Next symbol',
				choices: ['circle', 'square', 'star', 'diamond'],
				correctAnswer: 'square',
				explanation: 'Mirrored around center',
				difficultyScore: 1000,
				timeLimitSeconds: 30,
				metadata: {
					ruleType: 'mirrored_sequence',
					pattern: ['circle', 'square', 'star', 'diamond', 'star']
				},
				generatedSeed: 'seed-mir-2'
			};
			expect(verifySemanticInvariants(centerReflected).passed).toBe(true);

			// Corrupted reflection
			const corrupted: GeneratedQuestion = {
				...palindrome,
				correctAnswer: 'star'
			};
			const failResult = verifySemanticInvariants(corrupted);
			expect(failResult.passed).toBe(false);
			expect(failResult.reason).toContain('mirrored_sequence symmetry violated');
		});

		it('verifies growing_count grouping invariant', () => {
			// [A, B, B, C, C, C]
			const validGrowing: GeneratedQuestion = {
				questionType: 'symbol_pattern',
				prompt: 'Next symbol',
				choices: ['circle', 'square', 'diamond', 'star'],
				correctAnswer: 'diamond',
				explanation: 'Growing count',
				difficultyScore: 1000,
				timeLimitSeconds: 30,
				metadata: {
					ruleType: 'growing_count',
					pattern: ['circle', 'square', 'square', 'diamond', 'diamond']
				},
				generatedSeed: 'seed-grow'
			};
			expect(verifySemanticInvariants(validGrowing).passed).toBe(true);

			// Corrupted growing count: [circle, square, square, diamond, diamond, star]
			const corrupted: GeneratedQuestion = {
				...validGrowing,
				correctAnswer: 'star'
			};
			const failResult = verifySemanticInvariants(corrupted);
			expect(failResult.passed).toBe(false);
			expect(failResult.reason).toContain('growing_count grouping violated');
		});
	});

	describe('Semantic Oracles - Memory Pattern Contracts', () => {
		it('verifies difficulty sequence length and reveal time contracts', () => {
			const easyQuestion: GeneratedQuestion = {
				questionType: 'memory_pattern',
				prompt: 'What was the symbol at position 1?',
				choices: ['circle', 'square'],
				correctAnswer: 'circle',
				explanation: 'Symbol recall',
				difficultyScore: 800,
				timeLimitSeconds: 30,
				metadata: {
					ruleType: 'symbol_recall',
					memorize: ['circle', 'square', 'triangle', 'diamond', 'star'], // length 5
					difficulty: 'easy',
					revealSeconds: 4, // 4s for easy
					targetIndex: 0
				},
				generatedSeed: 'seed-mem-easy'
			};
			expect(verifySemanticInvariants(easyQuestion).passed).toBe(true);

			// Violate sequence length contract (4 instead of 5 for easy)
			const wrongLength: GeneratedQuestion = {
				...easyQuestion,
				metadata: {
					...easyQuestion.metadata,
					memorize: ['circle', 'square', 'triangle', 'diamond']
				}
			};
			expect(verifySemanticInvariants(wrongLength).passed).toBe(false);

			// Violate revealSeconds contract (5s instead of 4s for easy)
			const wrongReveal: GeneratedQuestion = {
				...easyQuestion,
				metadata: {
					...easyQuestion.metadata,
					revealSeconds: 5
				}
			};
			expect(verifySemanticInvariants(wrongReveal).passed).toBe(false);
		});

		it('enforces position_recall uniqueness guarantee and index correspondence', () => {
			// Valid position recall: target 'star' at index 2 (1-based position 3)
			const validPos: GeneratedQuestion = {
				questionType: 'memory_pattern',
				prompt: 'Where was the star?',
				choices: ['1', '2', '3', '4', '5'],
				correctAnswer: '3',
				explanation: 'Position recall',
				difficultyScore: 800,
				timeLimitSeconds: 30,
				metadata: {
					ruleType: 'position_recall',
					memorize: ['circle', 'square', 'star', 'diamond', 'hex'],
					difficulty: 'easy',
					revealSeconds: 4,
					targetIndex: 2,
					targetSymbol: 'star'
				},
				generatedSeed: 'seed-mem-pos'
			};
			expect(verifySemanticInvariants(validPos).passed).toBe(true);

			// Corrupted: target appears twice
			const duplicateTarget: GeneratedQuestion = {
				...validPos,
				metadata: {
					...validPos.metadata,
					memorize: ['circle', 'star', 'star', 'diamond', 'hex']
				}
			};
			const failResult = verifySemanticInvariants(duplicateTarget);
			expect(failResult.passed).toBe(false);
			expect(failResult.reason).toContain('must appear exactly once');
		});
	});

	describe('Semantic Oracles - Mini Deduction Contracts', () => {
		it('enforces deductionTarget matching and entity membership', () => {
			const validDeduction: GeneratedQuestion = {
				questionType: 'mini_deduction',
				prompt: 'Ari is taller than Bima. Bima is taller than Citra. Who is the tallest?',
				choices: ['Ari', 'Bima', 'Citra', 'Cannot determine'],
				correctAnswer: 'Ari',
				explanation: 'Ari is tallest',
				difficultyScore: 800,
				timeLimitSeconds: 30,
				metadata: {
					ruleType: 'comparison_chain',
					difficulty: 'easy',
					deductionTarget: 'Ari',
					entities: ['Ari', 'Bima', 'Citra']
				},
				generatedSeed: 'seed-ded-valid'
			};
			expect(verifySemanticInvariants(validDeduction).passed).toBe(true);

			// Corrupted: deductionTarget does not match correctAnswer
			const mismatchedAnswer: GeneratedQuestion = {
				...validDeduction,
				correctAnswer: 'Bima'
			};
			expect(verifySemanticInvariants(mismatchedAnswer).passed).toBe(false);

			// Corrupted: missing structured metadata
			const missingMeta: GeneratedQuestion = {
				...validDeduction,
				metadata: {
					ruleType: 'comparison_chain',
					difficulty: 'easy'
				}
			};
			expect(verifySemanticInvariants(missingMeta).passed).toBe(false);
		});
	});

	describe('Aggregate Failure Counting & Choice Anomalies Integration', () => {
		it('increments aggregate failure counts and failure rate when duplicate choice anomaly occurs', () => {
			const mockDuplicateRule = {
				ruleType: 'mock_duplicate_rule',
				questionType: 'number_sequence' as const,
				generator: () => ({
					questionType: 'number_sequence' as const,
					prompt: 'Sample question',
					choices: ['42', '42', '10', '20'], // DUPLICATE CHOICE!
					correctAnswer: '42',
					explanation: 'Mock',
					difficultyScore: 1000,
					timeLimitSeconds: 30,
					metadata: { ruleType: 'arithmetic_sequence', sequence: [42, 42, 42, '?'] },
					generatedSeed: 'seed-dup'
				})
			};

			const summary = runGeneratorBenchmark({
				iterationsPerCombination: 3,
				inventory: [mockDuplicateRule],
				difficulties: ['easy']
			});

			expect(summary.overallDuplicateChoiceAnomalies).toBe(3);
			expect(summary.overallObservedFailureRatePct).toBeGreaterThan(0);
			expect(summary.summaryStatement).not.toContain('0 failures');
			expect(summary.results[0]!.duplicateChoiceAnomalies).toBe(3);
		});

		it('increments aggregate failure counts and failure rate when ambiguous choice anomaly occurs', () => {
			const mockAmbiguousRule = {
				ruleType: 'mock_ambiguous_rule',
				questionType: 'number_sequence' as const,
				generator: () => ({
					questionType: 'number_sequence' as const,
					prompt: 'Sample question',
					choices: ['10', '20', '30', '40'], // 0 matches for correctAnswer '42' -> ambiguous/missing match
					correctAnswer: '42',
					explanation: 'Mock',
					difficultyScore: 1000,
					timeLimitSeconds: 30,
					metadata: { ruleType: 'arithmetic_sequence', sequence: [42, 42, 42, '?'] },
					generatedSeed: 'seed-ambig'
				})
			};

			const summary = runGeneratorBenchmark({
				iterationsPerCombination: 2,
				inventory: [mockAmbiguousRule],
				difficulties: ['easy']
			});

			expect(summary.overallAmbiguousChoiceAnomalies).toBe(2);
			expect(summary.overallObservedFailureRatePct).toBeGreaterThan(0);
			expect(summary.summaryStatement).not.toContain('0 failures');
			expect(summary.results[0]!.ambiguousChoiceAnomalies).toBe(2);
		});
	});

	describe('Generator Benchmark Harness (Full Active Rule Coverage)', () => {
		it('executes across all 22 dynamic rules and difficulties with 0 structural, semantic, choice, or replay errors', () => {
			const summary = runGeneratorBenchmark({
				iterationsPerCombination: 3,
				includeSemanticOracles: true,
				seedPrefix: 'unit-test-bench-p181'
			});

			expect(summary.totalSamples).toBeGreaterThan(0);
			expect(summary.overallStructuralFailures).toBe(0);
			expect(summary.overallSemanticFailures).toBe(0);
			expect(summary.overallReconstructionMismatches).toBe(0);
			expect(summary.overallDuplicateChoiceAnomalies).toBe(0);
			expect(summary.overallAmbiguousChoiceAnomalies).toBe(0);
			expect(summary.overallObservedFailureRatePct).toBe(0);
			expect(summary.summaryStatement).toContain('0 failures in');
			expect(summary.summaryStatement).toContain('observed rate: 0.00%');

			for (const res of summary.results) {
				expect(res.observedFailureRatePct).toBe(0);
				expect(res.duplicateChoiceAnomalies).toBe(0);
				expect(res.ambiguousChoiceAnomalies).toBe(0);
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
		it('generates deterministic daily puzzle snapshots with deep equality across dates', () => {
			const dailyReport = runDailyChallengeBenchmark(5);

			expect(dailyReport.failures).toBe(0);
			expect(dailyReport.reconstructionMismatches).toBe(0);
			expect(dailyReport.observedFailureRatePct).toBe(0);
			expect(dailyReport.formattedResult).toContain('0 failures in 5 daily snapshot generations');
		});

		it('verifies synthetic duel snapshot replay preserves 100% question fidelity (in-memory DTO check)', () => {
			const duelReport = runSyntheticDuelDtoReplayBenchmark(5);

			expect(duelReport.replayMismatches).toBe(0);
			expect(duelReport.observedFailureRatePct).toBe(0);
			expect(duelReport.formattedResult).toContain('0 mismatches in');
			expect(duelReport.formattedResult).toContain('synthetic DTO check only');
		});
	});
});
