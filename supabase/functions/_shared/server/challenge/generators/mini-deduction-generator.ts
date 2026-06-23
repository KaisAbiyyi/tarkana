import { createChoices } from '../../../server/challenge/choice-generator.ts';
import { resolveDifficultyScore } from '../../../server/challenge/difficulty-resolver.ts';
import { createSeededRng } from '../../../server/challenge/random/seeded-rng.ts';
import { validateGeneratedQuestion } from '../../../server/challenge/rule-validator.ts';
import type { GeneratedQuestion, GenerateQuestionInput } from '../../../server/challenge/types.ts';
import { createTranslator, resolveLocale } from '../../../i18n/index.ts';

export const MINI_DEDUCTION_RULES = [
	'comparison_chain',
	'object_ordering',
	'simple_elimination',
	'true_false_clue',
	'position_reasoning'
] as const;

const PEOPLE = ['Ari', 'Bima', 'Citra', 'Deni'];
type DeductionRule = (typeof MINI_DEDUCTION_RULES)[number];

export function generateMiniDeductionQuestion(input: GenerateQuestionInput): GeneratedQuestion {
	if (!MINI_DEDUCTION_RULES.includes(input.ruleType as DeductionRule)) {
		throw new Error(`Unsupported mini deduction rule: ${input.ruleType}`);
	}

	const rng = createSeededRng(`${input.seed}:deduction`);
	const t = createTranslator(resolveLocale(input.locale));
	const puzzle = buildPuzzle(input.ruleType as DeductionRule, rng, t);
	const choices = createChoices({
		correctAnswer: puzzle.answer,
		distractors: puzzle.distractors,
		rng
	});

	return validateGeneratedQuestion({
		questionType: 'mini_deduction',
		prompt: puzzle.prompt,
		choices,
		correctAnswer: puzzle.answer,
		explanation: puzzle.explanation,
		difficultyScore: resolveDifficultyScore({
			difficulty: input.difficulty,
			offset: rng.intBetween(0, 40)
		}),
		timeLimitSeconds: input.timeLimitSeconds,
		metadata: { ruleType: input.ruleType, difficulty: input.difficulty },
		generatedSeed: input.seed
	});
}

function buildPuzzle(
	rule: DeductionRule,
	rng: ReturnType<typeof createSeededRng>,
	t: import('$lib/i18n').Translator
) {
	const objects = [
		t('object.redCube'),
		t('object.blueCube'),
		t('object.greenCube'),
		t('object.yellowCube')
	];
	switch (rule) {
		case 'comparison_chain': {
			const [first, second, third] = rng.shuffle(PEOPLE).slice(0, 3) as [string, string, string];
			return {
				prompt: t('deduction.comparisonPrompt', { first, second, third }),
				answer: first,
				distractors: [second, third, t('arena.cannotDetermine')],
				explanation: t('deduction.comparisonExplain', { first, second, third })
			};
		}
		case 'object_ordering': {
			const [first, second, third] = rng.shuffle(objects).slice(0, 3) as [string, string, string];
			return {
				prompt: t('deduction.orderPrompt', { first, second, third }),
				answer: second,
				distractors: [first, third, t('arena.cannotDetermine')],
				explanation: t('deduction.orderExplain', { first, second, third })
			};
		}
		case 'simple_elimination': {
			const [correct, wrongA, wrongB] = rng.shuffle(PEOPLE).slice(0, 3) as [string, string, string];
			return {
				prompt: t('deduction.eliminationPrompt', { correct, wrongA, wrongB }),
				answer: correct,
				distractors: [wrongA, wrongB, t('arena.cannotDetermine')],
				explanation: t('deduction.eliminationExplain', { correct })
			};
		}
		case 'true_false_clue': {
			const [truth, falsehood] = rng.shuffle(PEOPLE).slice(0, 2) as [string, string];
			return {
				prompt: t('deduction.truthPrompt', { truth, falsehood }),
				answer: truth,
				distractors: [falsehood, t('deduction.both'), t('deduction.neither')],
				explanation: t('deduction.truthExplain', { truth })
			};
		}
		case 'position_reasoning': {
			const [left, middle, right] = rng.shuffle(PEOPLE).slice(0, 3) as [string, string, string];
			return {
				prompt: t('deduction.positionPrompt', { left, middle, right }),
				answer: middle,
				distractors: [left, right, t('arena.cannotDetermine')],
				explanation: t('deduction.positionExplain', { middle })
			};
		}
	}
}
