import { createChoices } from '$lib/server/challenge/choice-generator';
import { resolveDifficultyScore } from '$lib/server/challenge/difficulty-resolver';
import { createSeededRng } from '$lib/server/challenge/random/seeded-rng';
import { validateGeneratedQuestion } from '$lib/server/challenge/rule-validator';
import type { GeneratedQuestion, GenerateQuestionInput } from '$lib/server/challenge/types';

export const SYMBOL_PATTERN_RULES = [
	'symbol_rotation',
	'alternating_symbol',
	'repeating_cycle',
	'shape_order',
	'growing_count',
	'mirrored_sequence'
] as const;

const SHAPES = ['triangle-up', 'triangle-right', 'triangle-down', 'triangle-left'];
const SIMPLE_SHAPES = ['circle', 'square', 'triangle', 'diamond', 'star'];

type SymbolRule = (typeof SYMBOL_PATTERN_RULES)[number];

export function generateSymbolPatternQuestion(input: GenerateQuestionInput): GeneratedQuestion {
	if (!SYMBOL_PATTERN_RULES.includes(input.ruleType as SymbolRule)) {
		throw new Error(`Unsupported symbol pattern rule: ${input.ruleType}`);
	}

	const rng = createSeededRng(`${input.seed}:symbol`);
	const pattern = buildPattern(input.ruleType as SymbolRule, rng);
	const choices = createChoices({
		correctAnswer: pattern.answer,
		distractors: SIMPLE_SHAPES.concat(SHAPES, pattern.distractors),
		rng,
		exactSymbols: true
	});

	return validateGeneratedQuestion({
		questionType: 'symbol_pattern',
		prompt: `Find the next symbol: ${pattern.visible.join(' | ')} | ?`,
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

function buildPattern(rule: SymbolRule, rng: ReturnType<typeof createSeededRng>) {
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
				explanation: 'Symbol rotation: the direction rotates one step each time.'
			};
		}
		case 'alternating_symbol': {
			const first = rng.pick(SIMPLE_SHAPES);
			const second = rng.pick(SIMPLE_SHAPES.filter((shape) => shape !== first));
			const values = Array.from({ length: 6 }, (_, index) => (index % 2 === 0 ? first : second));
			return {
				visible: values.slice(0, 5),
				answer: values[5] as string,
				distractors: SIMPLE_SHAPES,
				explanation: `Alternating symbol: ${first} and ${second} repeat in turn.`
			};
		}
		case 'repeating_cycle': {
			const cycle = rng.shuffle(SIMPLE_SHAPES).slice(0, 3);
			const values = Array.from({ length: 6 }, (_, index) => cycle[index % cycle.length] as string);
			return {
				visible: values.slice(0, 5),
				answer: values[5] as string,
				distractors: SIMPLE_SHAPES,
				explanation: `Repeating cycle: the three-symbol cycle repeats.`
			};
		}
		case 'shape_order': {
			const start = rng.intBetween(0, SIMPLE_SHAPES.length - 1);
			const values = Array.from(
				{ length: 6 },
				(_, index) => SIMPLE_SHAPES[(start + index) % SIMPLE_SHAPES.length] as string
			);
			return {
				visible: values.slice(0, 5),
				answer: values[5] as string,
				distractors: SIMPLE_SHAPES,
				explanation: 'Shape order: the sequence follows the configured shape order.'
			};
		}
		case 'growing_count': {
			const shape = rng.pick(['dot', 'bar', 'x']);
			const values = Array.from({ length: 6 }, (_, index) => `${shape.repeat(index + 1)}`);
			return {
				visible: values.slice(0, 5),
				answer: values[5] as string,
				distractors: [shape, shape.repeat(2), shape.repeat(4), shape.repeat(7)],
				explanation: 'Growing count: the same symbol appears one more time at each step.'
			};
		}
		case 'mirrored_sequence': {
			const left = rng.shuffle(SIMPLE_SHAPES).slice(0, 3);
			const values = [...left, left[1], left[0], left[1]] as string[];
			return {
				visible: values.slice(0, 5),
				answer: values[5] as string,
				distractors: SIMPLE_SHAPES,
				explanation: 'Mirrored sequence: the pattern reflects back through the earlier symbols.'
			};
		}
	}
}
