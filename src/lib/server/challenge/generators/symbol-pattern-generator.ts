import { createChoices } from '$lib/server/challenge/choice-generator';
import { resolveDifficultyScore } from '$lib/server/challenge/difficulty-resolver';
import { createSeededRng } from '$lib/server/challenge/random/seeded-rng';
import { validateGeneratedQuestion } from '$lib/server/challenge/rule-validator';
import type { GeneratedQuestion, GenerateQuestionInput } from '$lib/server/challenge/types';
import { createTranslator, resolveLocale } from '$lib/i18n';

export const SYMBOL_PATTERN_RULES = [
	'symbol_rotation',
	'alternating_symbol',
	'repeating_cycle',
	'shape_order',
	'growing_count',
	'mirrored_sequence'
] as const;

const SHAPES = ['triangle-up', 'triangle-right', 'triangle-down', 'triangle-left'];

type SymbolRule = (typeof SYMBOL_PATTERN_RULES)[number];

export function generateSymbolPatternQuestion(input: GenerateQuestionInput): GeneratedQuestion {
	if (!SYMBOL_PATTERN_RULES.includes(input.ruleType as SymbolRule)) {
		throw new Error(`Unsupported symbol pattern rule: ${input.ruleType}`);
	}

	const rng = createSeededRng(`${input.seed}:symbol`);
	const t = createTranslator(resolveLocale(input.locale));
	const pattern = buildPattern(input.ruleType as SymbolRule, rng, t);
	const choices = createChoices({
		correctAnswer: pattern.answer,
		distractors: SHAPES,
		rng,
		exactSymbols: true
	});

	return validateGeneratedQuestion({
		questionType: 'symbol_pattern',
		prompt: t('question.nextSymbolSequence', { sequence: `${pattern.visible.join(' | ')} | ?` }),
		choices,
		correctAnswer: pattern.answer,
		explanation: pattern.explanation,
		difficultyScore: resolveDifficultyScore({
			difficulty: input.difficulty,
			offset: rng.intBetween(0, 40)
		}),
		timeLimitSeconds: input.timeLimitSeconds,
		metadata: { ruleType: input.ruleType, pattern: pattern.visible, difficulty: input.difficulty },
		generatedSeed: input.seed
	});
}

function buildPattern(
	rule: SymbolRule,
	rng: ReturnType<typeof createSeededRng>,
	t: import('$lib/i18n').Translator
) {
	switch (rule) {
		case 'symbol_rotation': {
			const start = rng.intBetween(0, SHAPES.length - 1);
			const values = Array.from(
				{ length: 6 },
				(_, index) => SHAPES[(start + index) % SHAPES.length] as string
			);
			return {
				visible: values.slice(0, 5),
				answer: values[5] as string,
				distractors: SHAPES,
				explanation: t('explain.rotation')
			};
		}
		case 'alternating_symbol': {
			const first = rng.pick(SHAPES);
			const second = rng.pick(SHAPES.filter((shape) => shape !== first));
			const values = Array.from({ length: 6 }, (_, index) => (index % 2 === 0 ? first : second));
			return {
				visible: values.slice(0, 5),
				answer: values[5] as string,
				distractors: SHAPES,
				explanation: t('explain.symbolAlternate', { first, second })
			};
		}
		case 'repeating_cycle': {
			const cycle = rng.shuffle(SHAPES).slice(0, 3);
			const values = Array.from({ length: 6 }, (_, index) => cycle[index % cycle.length] as string);
			return {
				visible: values.slice(0, 5),
				answer: values[5] as string,
				distractors: SHAPES,
				explanation: t('explain.cycle')
			};
		}
		case 'shape_order': {
			const start = rng.intBetween(0, SHAPES.length - 1);
			const values = Array.from(
				{ length: 6 },
				(_, index) => SHAPES[(start + index) % SHAPES.length] as string
			);
			return {
				visible: values.slice(0, 5),
				answer: values[5] as string,
				distractors: SHAPES,
				explanation: t('explain.shapeOrder')
			};
		}
		case 'growing_count': {
			const start = rng.intBetween(0, SHAPES.length - 1);
			const ordered = Array.from(
				{ length: SHAPES.length },
				(_, index) => SHAPES[(start + index) % SHAPES.length] as string
			);
			const values = [ordered[0], ordered[1], ordered[1], ordered[2], ordered[2], ordered[2]];
			return {
				visible: values.slice(0, 5),
				answer: values[5] as string,
				distractors: SHAPES,
				explanation: t('explain.growing')
			};
		}
		case 'mirrored_sequence': {
			const left = rng.shuffle(SHAPES).slice(0, 3);
			const values = [...left, left[1], left[0], left[1]] as string[];
			return {
				visible: values.slice(0, 5),
				answer: values[5] as string,
				distractors: SHAPES,
				explanation: t('explain.mirrored')
			};
		}
	}
}
