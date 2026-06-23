import { normalizeAnswer } from '../../server/challenge/normalization.ts';
import type { SeededRng } from '../../server/challenge/random/seeded-rng.ts';

export type ChoiceGenerationInput = {
	correctAnswer: string;
	distractors: string[];
	rng: SeededRng;
	count?: number;
	exactSymbols?: boolean;
};

export function createChoices(input: ChoiceGenerationInput): string[] {
	const count = input.count ?? 4;
	if (count < 2) throw new Error('Choice count must be at least 2');

	const choices = uniqueChoices([input.correctAnswer, ...input.distractors], {
		exactSymbols: input.exactSymbols
	});

	if (choices.length < count) {
		throw new Error('Not enough unique choices can be generated');
	}

	const selected = [input.correctAnswer];
	for (const candidate of choices) {
		if (selected.length >= count) break;
		if (
			normalizeAnswer(candidate, { exactSymbols: input.exactSymbols }) ===
			normalizeAnswer(input.correctAnswer, { exactSymbols: input.exactSymbols })
		) {
			continue;
		}
		selected.push(candidate);
	}

	return input.rng.shuffle(selected);
}

export function createNumericDistractors(input: {
	correctAnswer: number;
	rng: SeededRng;
	spread?: number;
	count?: number;
	excluded?: number[];
}): string[] {
	const spread = input.spread ?? Math.max(3, Math.ceil(Math.abs(input.correctAnswer) * 0.25));
	const targetCount = input.count ?? 8;
	const excluded = new Set([input.correctAnswer, ...(input.excluded ?? [])]);
	const distractors = new Set<number>();

	for (let attempt = 0; attempt < 60 && distractors.size < targetCount; attempt += 1) {
		const offset = input.rng.intBetween(-spread, spread);
		const candidate = input.correctAnswer + (offset === 0 ? spread + attempt + 1 : offset);
		if (!excluded.has(candidate)) distractors.add(candidate);
	}

	return [...distractors].map(String);
}

function uniqueChoices(choices: string[], options: { exactSymbols?: boolean }): string[] {
	const seen = new Set<string>();
	const unique: string[] = [];

	for (const choice of choices) {
		const normalized = normalizeAnswer(choice, options);
		if (normalized.length === 0 || seen.has(normalized)) continue;
		seen.add(normalized);
		unique.push(choice);
	}

	return unique;
}
