import type { DifficultyBand, QuestionType } from '$lib/shared/constants/challenge';

export type LatencyPercentiles = {
	minMs: number;
	p50Ms: number;
	p90Ms: number;
	p95Ms: number;
	p99Ms: number;
	maxMs: number;
	avgMs: number;
};

export type SemanticCheckResult = {
	passed: boolean;
	ruleType: string;
	reason?: string;
};

export type RuleBenchmarkResult = {
	ruleType: string;
	questionType: QuestionType;
	difficulty: DifficultyBand;
	sampleCount: number;
	structuralFailures: number;
	semanticFailures: number;
	reconstructionMismatches: number;
	duplicateChoiceAnomalies: number;
	ambiguousChoiceAnomalies: number;
	observedFailureRatePct: number;
	formattedResult: string;
	latency: LatencyPercentiles;
	sampleErrors: Array<{
		seed: string;
		errorType: 'structural' | 'semantic' | 'reconstruction' | 'choice';
		message: string;
	}>;
};

export type BenchmarkRunOptions = {
	iterationsPerCombination?: number;
	rules?: string[];
	difficulties?: DifficultyBand[];
	locales?: Array<'en' | 'id'>;
	seedPrefix?: string;
	includeSemanticOracles?: boolean;
};

export type BenchmarkSummary = {
	runtime: {
		nodeVersion: string;
		platform: string;
		arch: string;
		timestamp: string;
		commitSha: string;
		generatorVersion: string;
	};
	totalSamples: number;
	totalRuleCombinations: number;
	overallStructuralFailures: number;
	overallSemanticFailures: number;
	overallReconstructionMismatches: number;
	overallObservedFailureRatePct: number;
	summaryStatement: string;
	aggregateLatency: LatencyPercentiles;
	results: RuleBenchmarkResult[];
};
