#!/usr/bin/env node
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// CLI args parsing
const args = process.argv.slice(2);
let iterations = 100;
let jsonOnly = false;
let seedPrefix = 'tarkana-bench-v1';
let outputPath = resolve(
	projectRoot,
	'docs/productization/artifacts/generator-benchmark-report.json'
);

for (const arg of args) {
	if (arg.startsWith('--iterations=')) {
		iterations = parseInt(arg.split('=')[1], 10) || 100;
	} else if (arg === '--json') {
		jsonOnly = true;
	} else if (arg.startsWith('--seed-prefix=')) {
		seedPrefix = arg.split('=')[1] || 'tarkana-bench-v1';
	} else if (arg.startsWith('--output=')) {
		outputPath = resolve(process.cwd(), arg.split('=')[1]);
	}
}

// Git commit resolution
let commitSha = process.env.GITHUB_SHA || process.env.GIT_COMMIT || '';
if (!commitSha) {
	try {
		commitSha = execSync('git rev-parse HEAD', { cwd: projectRoot, encoding: 'utf-8' }).trim();
	} catch {
		commitSha = 'local';
	}
}

async function main() {
	if (!jsonOnly) {
		console.log('\n================================================================');
		console.log('       TARKANA PROCEDURAL GENERATOR BENCHMARK SUITE (P1.8.1)');
		console.log('================================================================\n');
		console.log(`Config: ${iterations} iterations per rule × difficulty combination`);
		console.log(`Seed Prefix: ${seedPrefix} | Git Commit: ${commitSha}`);
		console.log(`Node: ${process.version} | Platform: ${process.platform} (${process.arch})\n`);
	}

	const viteServer = await createServer({
		root: projectRoot,
		server: { middlewareMode: true },
		appType: 'custom'
	});

	try {
		// 1. Generator Benchmark
		const genModule = await viteServer.ssrLoadModule(
			'/src/lib/server/challenge/benchmark/generator-benchmark.ts'
		);
		const { runGeneratorBenchmark } = genModule;

		const startGen = performance.now();
		const generatorSummary = runGeneratorBenchmark({
			iterationsPerCombination: iterations,
			includeSemanticOracles: true,
			seedPrefix,
			commitSha
		});
		const elapsedGen = performance.now() - startGen;

		// 2. Challenge Builder Benchmark
		const builderModule = await viteServer.ssrLoadModule(
			'/src/lib/server/challenge/benchmark/challenge-builder-benchmark.ts'
		);
		const { runChallengeBuilderBenchmark } = builderModule;
		const builderIterations = Math.max(10, Math.floor(iterations / 5));
		const builderReport = runChallengeBuilderBenchmark(builderIterations);

		// 3. Daily & Duel Snapshot Benchmarks
		const dailyDuelModule = await viteServer.ssrLoadModule(
			'/src/lib/server/challenge/benchmark/daily-and-duel-benchmark.ts'
		);
		const { runDailyChallengeBenchmark, runSyntheticDuelDtoReplayBenchmark } = dailyDuelModule;
		const dailyReport = runDailyChallengeBenchmark(Math.max(10, Math.floor(iterations / 5)));
		const duelReport = runSyntheticDuelDtoReplayBenchmark(Math.max(10, Math.floor(iterations / 5)));

		// 4. Version info
		const dailyModule = await viteServer.ssrLoadModule(
			'/src/lib/server/challenge/daily-challenge.ts'
		);
		const { DAILY_CHALLENGE_CONFIG_VERSION, DAILY_CHALLENGE_GENERATOR_VERSION } = dailyModule;

		const fullReport = {
			metadata: {
				generatedAt: new Date().toISOString(),
				nodeVersion: process.version,
				platform: process.platform,
				arch: process.arch,
				commitSha,
				seedPrefix,
				configVersions: {
					dailyChallengeConfigVersion: DAILY_CHALLENGE_CONFIG_VERSION ?? 'unknown',
					dailyChallengeGeneratorVersion: DAILY_CHALLENGE_GENERATOR_VERSION ?? 'unknown',
					generatorBenchmarkVersion: '1.8.1'
				},
				iterationsPerCombination: iterations,
				totalExecutionTimeMs: Number(elapsedGen.toFixed(2))
			},
			generators: generatorSummary,
			challengeBuilder: builderReport,
			dailySnapshot: dailyReport,
			syntheticDuelDtoReplay: duelReport
		};

		// Write artifact to disk
		mkdirSync(dirname(outputPath), { recursive: true });
		writeFileSync(outputPath, JSON.stringify(fullReport, null, 2), 'utf-8');

		if (jsonOnly) {
			console.log(JSON.stringify(fullReport, null, 2));
			return;
		}

		// Terminal ASCII Display
		console.log('--- GENERATOR INVENTORY BENCHMARK RESULTS ---');
		console.log(
			padRight('Rule Type', 24) +
				' | ' +
				padRight('Category', 16) +
				' | ' +
				padRight('Diff', 6) +
				' | ' +
				padRight('Samples', 7) +
				' | ' +
				padRight('Struct', 7) +
				' | ' +
				padRight('Sem/Replay', 10) +
				' | ' +
				padRight('Obs Rate', 9) +
				' | ' +
				padRight('p50(ms)', 8) +
				' | ' +
				padRight('p95(ms)', 8)
		);
		console.log('-'.repeat(105));

		for (const r of generatorSummary.results) {
			const semAndReplay = `${r.semanticFailures}/${r.reconstructionMismatches}`;
			console.log(
				padRight(r.ruleType, 24) +
					' | ' +
					padRight(r.questionType, 16) +
					' | ' +
					padRight(r.difficulty, 6) +
					' | ' +
					padRight(String(r.sampleCount), 7) +
					' | ' +
					padRight(String(r.structuralFailures), 7) +
					' | ' +
					padRight(semAndReplay, 10) +
					' | ' +
					padRight(`${r.observedFailureRatePct.toFixed(2)}%`, 9) +
					' | ' +
					padRight(r.latency.p50Ms.toFixed(2), 8) +
					' | ' +
					padRight(r.latency.p95Ms.toFixed(2), 8)
			);
		}

		console.log('-'.repeat(105));
		console.log(`\nOverall Summary: ${generatorSummary.summaryStatement}`);
		console.log(
			`Latency: min=${generatorSummary.aggregateLatency.minMs}ms | p50=${generatorSummary.aggregateLatency.p50Ms}ms | p90=${generatorSummary.aggregateLatency.p90Ms}ms | p95=${generatorSummary.aggregateLatency.p95Ms}ms | max=${generatorSummary.aggregateLatency.maxMs}ms | avg=${generatorSummary.aggregateLatency.avgMs}ms`
		);

		console.log('\n--- CHALLENGE BUILDER BENCHMARK ---');
		for (const b of builderReport.results) {
			console.log(
				`- ${padRight(b.challengeType, 24)}: ${b.formattedResult} (p50: ${b.latency.p50Ms}ms, p95: ${b.latency.p95Ms}ms)`
			);
		}
		console.log(`Builder Summary: ${builderReport.summaryStatement}`);

		console.log('\n--- DETERMINISTIC DAILY PUZZLE SNAPSHOTS ---');
		console.log(
			`- Daily Generator: ${dailyReport.formattedResult} (p50: ${dailyReport.latency.p50Ms}ms, p95: ${dailyReport.latency.p95Ms}ms)`
		);

		console.log('\n--- SYNTHETIC DUEL DTO REPLAY (In-Memory Check) ---');
		console.log(
			`- Duel Replay: ${duelReport.formattedResult} (p50: ${duelReport.latency.p50Ms}ms, p95: ${duelReport.latency.p95Ms}ms)`
		);

		console.log(`\nArtifact report saved to: ${outputPath}\n`);
	} finally {
		await viteServer.close();
	}
}

function padRight(str, length) {
	if (str.length >= length) return str.slice(0, length);
	return str + ' '.repeat(length - str.length);
}

main().catch((err) => {
	console.error('Benchmark failed:', err);
	process.exit(1);
});
