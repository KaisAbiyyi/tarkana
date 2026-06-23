import { createChoices } from '../../../server/challenge/choice-generator.ts';
import { resolveDifficultyScore } from '../../../server/challenge/difficulty-resolver.ts';
import { createSeededRng } from '../../../server/challenge/random/seeded-rng.ts';
import { validateGeneratedQuestion } from '../../../server/challenge/rule-validator.ts';
import type { GeneratedQuestion, GenerateQuestionInput } from '../../../server/challenge/types.ts';
import { createTranslator, resolveLocale } from '../../../i18n/index.ts';

export const SYMBOL_PATTERN_RULES = [
	'symbol_rotation',
	'alternating_symbol',
	'repeating_cycle',
	'shape_order',
	'growing_count',
	'mirrored_sequence'
] as const;

const ALL_SHAPES = ['circle', 'square', 'diamond', 'star', 'triangle-up', 'triangle-right', 'triangle-down', 'triangle-left'];
const SIMPLE_SHAPES = ['circle', 'square', 'diamond', 'star'];
const TRIANGLES = ['triangle-up', 'triangle-right', 'triangle-down', 'triangle-left'];

type SymbolRule = (typeof SYMBOL_PATTERN_RULES)[number];

export function generateSymbolPatternQuestion(input: GenerateQuestionInput): GeneratedQuestion {
	if (!SYMBOL_PATTERN_RULES.includes(input.ruleType as SymbolRule)) {
		throw new Error(`Unsupported symbol pattern rule: ${input.ruleType}`);
	}

	const rng = createSeededRng(`${input.seed}:symbol`);
	const t = createTranslator(resolveLocale(input.locale));
	const pattern = buildPattern(input.ruleType as SymbolRule, rng, t, input.difficulty);
	const choices = createChoices({
		correctAnswer: pattern.answer,
		distractors: pattern.distractors,
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
	t: import('$lib/i18n').Translator,
	difficulty: 'easy' | 'medium' | 'hard'
) {
	const useComplexShapes = difficulty === 'hard' || (difficulty === 'medium' && rng.boolean());
	const shapePool = useComplexShapes ? ALL_SHAPES : SIMPLE_SHAPES;

	switch (rule) {
		case 'symbol_rotation': {
			// Instead of just triangles, rotate through a sequence of shapes
			const pool = difficulty === 'easy' ? TRIANGLES : rng.shuffle(shapePool).slice(0, difficulty === 'hard' ? 5 : 4);
			const start = rng.intBetween(0, pool.length - 1);
			const step = difficulty === 'hard' ? 2 : 1; // Hard skips one
			
			const values = Array.from(
				{ length: 6 },
				(_, index) => pool[(start + index * step) % pool.length] as string
			);
			return {
				visible: values.slice(0, 5),
				answer: values[5] as string,
				distractors: pool,
				explanation: t('explain.rotation')
			};
		}
		case 'alternating_symbol': {
			const first = rng.pick(shapePool);
			const second = rng.pick(shapePool.filter((shape) => shape !== first));
			let values: string[];
			
			if (difficulty === 'hard') {
				// A B A B C D -> wait, alternating could be A B C A B C
				const third = rng.pick(shapePool.filter((shape) => shape !== first && shape !== second));
				values = Array.from({ length: 6 }, (_, index) => [first, second, third][index % 3] as string);
			} else {
				values = Array.from({ length: 6 }, (_, index) => (index % 2 === 0 ? first : second));
			}
			
			return {
				visible: values.slice(0, 5),
				answer: values[5] as string,
				distractors: shapePool,
				explanation: t('explain.symbolAlternate', { first, second })
			};
		}
		case 'repeating_cycle': {
			const cycleLength = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4;
			const cycle = rng.shuffle(shapePool).slice(0, cycleLength);
			const values = Array.from({ length: 6 }, (_, index) => cycle[index % cycle.length] as string);
			return {
				visible: values.slice(0, 5),
				answer: values[5] as string,
				distractors: shapePool,
				explanation: t('explain.cycle')
			};
		}
		case 'shape_order': {
			const cycle = rng.shuffle(shapePool).slice(0, 4);
			const values = Array.from(
				{ length: 6 },
				(_, index) => cycle[index % cycle.length] as string
			);
			return {
				visible: values.slice(0, 5),
				answer: values[5] as string,
				distractors: shapePool,
				explanation: t('explain.shapeOrder')
			};
		}
		case 'growing_count': {
			const startShape = rng.pick(shapePool);
			const secondShape = rng.pick(shapePool.filter(s => s !== startShape));
			
			// Easy: A, B, B, C, C, C -> represented by shapes
			// Medium: A, A, B, B, B, C, C, C, C -> we only have 6 slots
			let values: string[];
			if (difficulty === 'easy') {
				values = [startShape, secondShape, secondShape, startShape, startShape, startShape];
			} else {
				const thirdShape = rng.pick(shapePool.filter(s => s !== startShape && s !== secondShape));
				values = [startShape, secondShape, secondShape, thirdShape, thirdShape, thirdShape];
			}
			
			return {
				visible: values.slice(0, 5),
				answer: values[5] as string,
				distractors: shapePool,
				explanation: t('explain.growing')
			};
		}
		case 'mirrored_sequence': {
			const left = rng.shuffle(shapePool).slice(0, difficulty === 'hard' ? 4 : 3);
			let values: string[];
			if (difficulty === 'hard') {
				// A B C D C B (mirrored around D)
				values = [left[0], left[1], left[2], left[3], left[2], left[1]] as string[];
			} else {
				// A B C C B A
				values = [left[0], left[1], left[2], left[2], left[1], left[0]] as string[];
			}
			return {
				visible: values.slice(0, 5),
				answer: values[5] as string,
				distractors: shapePool,
				explanation: t('explain.mirrored')
			};
		}
	}
}
