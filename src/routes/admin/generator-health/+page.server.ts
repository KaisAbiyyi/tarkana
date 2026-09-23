import type { Actions, PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/auth/guards';
import { getRuleInventory } from '$lib/server/challenge/generators/registry';
import { getGeneratedQuestionErrors } from '$lib/server/challenge/rule-validator';
import { verifySemanticInvariants } from '$lib/server/challenge/benchmark/semantic-oracles';
import { normalizeAnswer } from '$lib/server/challenge/normalization';
import { DIFFICULTY_BANDS, type DifficultyBand } from '$lib/shared/constants/challenge';
import { fail } from '@sveltejs/kit';
import type { GeneratedQuestion } from '$lib/server/challenge/types';

export const load: PageServerLoad = async (event) => {
	await requireAdmin(event);

	const inventory = getRuleInventory();
	const samples = inventory.map((item) => {
		const seed = `admin-health-${item.ruleType}`;
		const start = performance.now();
		let question: GeneratedQuestion | null = null;
		let error: string | null = null;
		let structuralValid = false;
		let semanticValid = false;
		let replayValid = false;

		try {
			question = item.generator({
				seed,
				difficulty: 'medium',
				ruleType: item.ruleType,
				timeLimitSeconds: 30,
				locale: event.locals.locale
			});

			const structuralErrors = getGeneratedQuestionErrors(question);
			structuralValid = structuralErrors.length === 0;

			const semCheck = verifySemanticInvariants(question);
			semanticValid = semCheck.passed;

			const replay = item.generator({
				seed,
				difficulty: 'medium',
				ruleType: item.ruleType,
				timeLimitSeconds: 30,
				locale: event.locals.locale
			});
			replayValid = JSON.stringify(question) === JSON.stringify(replay);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : String(err);
		}

		const latencyMs = Number((performance.now() - start).toFixed(2));
		const isHealthy = structuralValid && semanticValid && replayValid && !error;

		return {
			ruleType: item.ruleType,
			questionType: item.questionType,
			isHealthy,
			latencyMs,
			structuralValid,
			semanticValid,
			replayValid,
			error,
			samplePrompt: question?.prompt ?? 'N/A',
			sampleAnswer: question?.correctAnswer ?? 'N/A'
		};
	});

	const healthyCount = samples.filter((s) => s.isHealthy).length;

	return {
		ruleCount: inventory.length,
		healthyCount,
		allHealthy: healthyCount === inventory.length,
		samples,
		runtime: {
			nodeVersion: process.version,
			platform: process.platform,
			arch: process.arch
		}
	};
};

export const actions: Actions = {
	diagnose: async (event) => {
		await requireAdmin(event);
		const form = await event.request.formData();

		const rawRuleType = String(form.get('ruleType') ?? '').trim();
		const rawDifficulty = String(form.get('difficulty') ?? 'medium').trim() as DifficultyBand;
		const rawSeed = String(form.get('seed') ?? '').trim();

		// Bounded seed input: max 64 characters, sanitize
		if (rawSeed.length > 64) {
			return fail(400, {
				error: 'Seed must be at most 64 characters long',
				diagnostic: null
			});
		}

		const seed = rawSeed || `live-diag-${Date.now()}`;

		if (!DIFFICULTY_BANDS.includes(rawDifficulty)) {
			return fail(400, {
				error: `Invalid difficulty band. Must be one of: ${DIFFICULTY_BANDS.join(', ')}`,
				diagnostic: null
			});
		}

		const inventory = getRuleInventory();
		const ruleItem = inventory.find((r) => r.ruleType === rawRuleType);
		if (!ruleItem) {
			return fail(400, {
				error: `Unknown rule type '${rawRuleType}'`,
				diagnostic: null
			});
		}

		const start = performance.now();
		let question: GeneratedQuestion;
		try {
			question = ruleItem.generator({
				seed,
				difficulty: rawDifficulty,
				ruleType: ruleItem.ruleType,
				timeLimitSeconds: 30,
				locale: event.locals.locale
			});
		} catch (err: unknown) {
			return fail(500, {
				error: `Generator threw an uncaught error: ${err instanceof Error ? err.message : String(err)}`,
				diagnostic: null
			});
		}
		const latencyMs = Number((performance.now() - start).toFixed(3));

		const structuralErrors = getGeneratedQuestionErrors(question);
		const semanticResult = verifySemanticInvariants(question);

		// Normalized choices check
		const exactSymbols = question.questionType === 'symbol_pattern';
		const normalizedChoices = question.choices.map((c) => normalizeAnswer(c, { exactSymbols }));
		const uniqueChoicesCount = new Set(normalizedChoices).size;
		const choicesUnique = uniqueChoicesCount === question.choices.length;

		const correctNormalized = normalizeAnswer(question.correctAnswer, { exactSymbols });
		const answerMatches = normalizedChoices.filter((c) => c === correctNormalized).length;
		const answerUnambiguous = answerMatches === 1;

		// Deterministic replay check
		const replayMatches = (() => {
			try {
				const replay = ruleItem.generator({
					seed,
					difficulty: rawDifficulty,
					ruleType: ruleItem.ruleType,
					timeLimitSeconds: 30,
					locale: event.locals.locale
				});
				return JSON.stringify(question) === JSON.stringify(replay);
			} catch {
				return false;
			}
		})();

		return {
			success: true,
			error: null,
			diagnostic: {
				ruleType: ruleItem.ruleType,
				questionType: ruleItem.questionType,
				difficulty: rawDifficulty,
				seed,
				latencyMs,
				structural: {
					valid: structuralErrors.length === 0,
					errors: structuralErrors
				},
				semantic: {
					valid: semanticResult.passed,
					reason: semanticResult.reason ?? null
				},
				choices: {
					unique: choicesUnique,
					unambiguous: answerUnambiguous,
					rawChoices: question.choices,
					normalizedChoices
				},
				replay: {
					deterministic: replayMatches
				},
				question: {
					prompt: question.prompt,
					choices: question.choices,
					correctAnswer: question.correctAnswer,
					explanation: question.explanation,
					difficultyScore: question.difficultyScore,
					metadata: question.metadata
				}
			}
		};
	}
};
