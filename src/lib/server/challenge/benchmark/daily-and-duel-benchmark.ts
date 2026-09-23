import type { Category, DailyPuzzleSnapshotQuestion, QuestionRule } from '$lib/server/db/schema';
import { generateDailyPuzzleSnapshot } from '$lib/server/challenge/daily-challenge';
import { getRuleInventory } from '$lib/server/challenge/generators/registry';
import {
	computeLatencyPercentiles,
	isDeepEqual
} from '$lib/server/challenge/benchmark/generator-benchmark';
import type { LatencyPercentiles } from '$lib/server/challenge/benchmark/types';

export type DailyBenchmarkResult = {
	sampleDatesCount: number;
	failures: number;
	reconstructionMismatches: number;
	observedFailureRatePct: number;
	formattedResult: string;
	latency: LatencyPercentiles;
};

export type DuelReplayBenchmarkResult = {
	sessionsSampled: number;
	totalQuestionsReplayed: number;
	replayMismatches: number;
	observedFailureRatePct: number;
	formattedResult: string;
	latency: LatencyPercentiles;
};

export function runDailyChallengeBenchmark(daysToTest = 15): DailyBenchmarkResult {
	const inventory = getRuleInventory();
	const secret = 'benchmark-daily-secret-key-32chars!!';
	const now = new Date();

	const sampleRules: QuestionRule[] = inventory.flatMap((item, idx) => [
		{
			id: `rule-${item.ruleType}-easy-${idx}`,
			categoryId: `cat-${item.questionType}`,
			ruleType: item.ruleType,
			difficultyMin: 0,
			difficultyMax: 1000,
			difficultyBand: 'easy' as const,
			timeLimitSeconds: 30,
			config: {},
			isActive: true,
			createdAt: now,
			updatedAt: now
		},
		{
			id: `rule-${item.ruleType}-med-${idx}`,
			categoryId: `cat-${item.questionType}`,
			ruleType: item.ruleType,
			difficultyMin: 800,
			difficultyMax: 1600,
			difficultyBand: 'medium' as const,
			timeLimitSeconds: 30,
			config: {},
			isActive: true,
			createdAt: now,
			updatedAt: now
		},
		{
			id: `rule-${item.ruleType}-hard-${idx}`,
			categoryId: `cat-${item.questionType}`,
			ruleType: item.ruleType,
			difficultyMin: 1400,
			difficultyMax: 3000,
			difficultyBand: 'hard' as const,
			timeLimitSeconds: 45,
			config: {},
			isActive: true,
			createdAt: now,
			updatedAt: now
		}
	]);

	const sampleCategories: Category[] = [
		{
			id: 'cat-number_sequence',
			name: 'Number Sequence',
			slug: 'number-sequence',
			description: null,
			isActive: true,
			createdAt: now,
			updatedAt: now
		},
		{
			id: 'cat-symbol_pattern',
			name: 'Symbol Pattern',
			slug: 'symbol-pattern',
			description: null,
			isActive: true,
			createdAt: now,
			updatedAt: now
		},
		{
			id: 'cat-mini_deduction',
			name: 'Mini Deduction',
			slug: 'mini-deduction',
			description: null,
			isActive: true,
			createdAt: now,
			updatedAt: now
		},
		{
			id: 'cat-memory_pattern',
			name: 'Memory Pattern',
			slug: 'memory-pattern',
			description: null,
			isActive: true,
			createdAt: now,
			updatedAt: now
		}
	];

	const latencies: number[] = [];
	let failures = 0;
	let mismatches = 0;

	for (let d = 1; d <= daysToTest; d++) {
		const dayStr = String(d).padStart(2, '0');
		const dateString = `2026-10-${dayStr}`;

		const start = performance.now();
		try {
			const snapshot = generateDailyPuzzleSnapshot({
				dateString,
				secret,
				rules: sampleRules,
				categories: sampleCategories
			});

			if (snapshot.puzzleSnapshot.length !== 10) {
				failures++;
			}

			// Verify replay with identical date and secret yields 100% deep equality
			const replay = generateDailyPuzzleSnapshot({
				dateString,
				secret,
				rules: sampleRules,
				categories: sampleCategories
			});

			if (!isDeepEqual(snapshot.puzzleSnapshot, replay.puzzleSnapshot)) {
				mismatches++;
			}
		} catch {
			failures++;
		}
		latencies.push(performance.now() - start);
	}

	const totalErrors = failures + mismatches;
	const rate = (totalErrors / daysToTest) * 100;

	return {
		sampleDatesCount: daysToTest,
		failures,
		reconstructionMismatches: mismatches,
		observedFailureRatePct: Number(rate.toFixed(2)),
		formattedResult: `${totalErrors} failures in ${daysToTest} daily snapshot generations (observed rate: ${rate.toFixed(2)}%)`,
		latency: computeLatencyPercentiles(latencies)
	};
}

/**
 * Synthetic DTO replay benchmark: validates deep equality of simulated memory DTO mappings.
 * NOTE: This is an isolated, in-memory synthetic DTO replay check.
 * It does NOT exercise the canonical production database snapshot-copy/session-spawn path (`spawnParticipantSessionTransaction`).
 */
export function runSyntheticDuelDtoReplayBenchmark(
	sessionsToSimulate = 20
): DuelReplayBenchmarkResult {
	const latencies: number[] = [];
	let mismatches = 0;
	let totalQuestions = 0;

	for (let s = 0; s < sessionsToSimulate; s++) {
		// Create a mock immutable challenger questions snapshot (10 questions)
		const sourceQuestions: DailyPuzzleSnapshotQuestion[] = Array.from({ length: 10 }, (_, i) => ({
			orderIndex: i,
			categoryId: `cat-${i % 4}`,
			questionType: (
				['number_sequence', 'symbol_pattern', 'mini_deduction', 'memory_pattern'] as const
			)[i % 4]!,
			prompt: `Simulated Challenge Question ${i + 1} with seed source-${s}-${i}`,
			choices: [`Choice A ${i}`, `Choice B ${i}`, `Choice C ${i}`, `Choice D ${i}`],
			correctAnswer: `Choice A ${i}`,
			explanation: `Explanation for question ${i + 1}`,
			difficultyScore: 1000,
			timeLimitSeconds: 30,
			metadata: { sourceSeed: `source-${s}-${i}`, originalOrder: i },
			generatedSeed: `source-seed-${s}-${i}`
		}));

		totalQuestions += sourceQuestions.length;

		const start = performance.now();
		// Simulate Duel participant session question replication
		const participantQuestions = sourceQuestions.map((sq) => ({
			...sq,
			participantSessionId: `part-session-${s}`,
			replicatedAt: Date.now()
		}));

		// Verify deep equality of challenge payload (prompt, choices, answer, explanation, order)
		for (let i = 0; i < sourceQuestions.length; i++) {
			const src = sourceQuestions[i]!;
			const part = participantQuestions[i]!;

			if (
				src.prompt !== part.prompt ||
				src.correctAnswer !== part.correctAnswer ||
				src.explanation !== part.explanation ||
				src.orderIndex !== part.orderIndex ||
				src.choices.length !== part.choices.length ||
				src.choices.some((c: string, idx: number) => c !== part.choices[idx])
			) {
				mismatches++;
			}
		}
		latencies.push(performance.now() - start);
	}

	const rate = (mismatches / totalQuestions) * 100;
	return {
		sessionsSampled: sessionsToSimulate,
		totalQuestionsReplayed: totalQuestions,
		replayMismatches: mismatches,
		observedFailureRatePct: Number(rate.toFixed(2)),
		formattedResult: `${mismatches} mismatches in ${totalQuestions} replayed questions across ${sessionsToSimulate} synthetic duels (observed rate: ${rate.toFixed(2)}% - synthetic DTO check only)`,
		latency: computeLatencyPercentiles(latencies)
	};
}

/** Alias for backward compatibility */
export const runDuelSnapshotReplayBenchmark = runSyntheticDuelDtoReplayBenchmark;
