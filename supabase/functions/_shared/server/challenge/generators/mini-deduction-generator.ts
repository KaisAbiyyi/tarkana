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
	const puzzle = buildPuzzle(input.ruleType as DeductionRule, rng, t, input.difficulty);
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
	t: import('$lib/i18n').Translator,
	difficulty: 'easy' | 'medium' | 'hard'
) {
	const objects = [
		t('object.redCube'),
		t('object.blueCube'),
		t('object.greenCube'),
		t('object.yellowCube')
	];

	const people = [...PEOPLE, 'Eka', 'Fara'];

	switch (rule) {
		case 'comparison_chain': {
			// Easy: A > B, B > C.
			// Medium: A > B, B > C, C > D.
			// Hard: A > B, C < B, D < C, E < D.
			if (difficulty === 'easy') {
				const [first, second, third] = rng.shuffle(people).slice(0, 3) as [string, string, string];
				return {
					prompt: t('deduction.comparisonPrompt', { first, second, third }),
					answer: first,
					distractors: [second, third, t('arena.cannotDetermine')],
					explanation: t('deduction.comparisonExplain', { first, second, third })
				};
			} else {
				const [first, second, third, fourth] = rng.shuffle(people).slice(0, 4) as [
					string,
					string,
					string,
					string
				];
				const base = t('deduction.comparisonPrompt', { first, second, third });
				const extra =
					t('deduction.comparisonExplain', { first: third, second: fourth, third: 'x' }).split(
						'.'
					)[0] + '.';
				// We combine base prompt with an extra clue from another translation
				return {
					prompt: `${base.replace('?', '')} ${extra} ?`,
					answer: first,
					distractors: [second, third, fourth, t('arena.cannotDetermine')],
					explanation: t('deduction.comparisonExplain', { first, second, third })
				};
			}
		}
		case 'object_ordering': {
			const numObjects = difficulty === 'easy' ? 3 : 4;
			const selection = rng.shuffle(objects).slice(0, numObjects);

			if (difficulty === 'easy') {
				return {
					prompt: t('deduction.orderPrompt', {
						first: selection[0]!,
						second: selection[1]!,
						third: selection[2]!
					}),
					answer: selection[1] as string,
					distractors: [selection[0] as string, selection[2] as string, t('arena.cannotDetermine')],
					explanation: t('deduction.orderExplain', {
						first: selection[0]!,
						second: selection[1]!,
						third: selection[2]!
					})
				};
			} else {
				return {
					prompt:
						t('deduction.orderPrompt', {
							first: selection[0]!,
							second: selection[1]!,
							third: selection[2]!
						}) +
						' ' +
						t('deduction.orderExplain', {
							first: selection[2]!,
							second: selection[3]!,
							third: 'x'
						}),
					answer: selection[3] as string,
					distractors: [selection[0] as string, selection[1] as string, selection[2] as string],
					explanation: 'Combined logic.'
				};
			}
		}
		case 'simple_elimination': {
			const numPeople = difficulty === 'hard' ? 5 : difficulty === 'medium' ? 4 : 3;
			const selection = rng.shuffle(people).slice(0, numPeople);

			if (difficulty === 'easy') {
				return {
					prompt: t('deduction.eliminationPrompt', {
						correct: selection[0],
						wrongA: selection[1],
						wrongB: selection[2]
					}),
					answer: selection[0] as string,
					distractors: [selection[1] as string, selection[2] as string, t('arena.cannotDetermine')],
					explanation: t('deduction.eliminationExplain', { correct: selection[0] })
				};
			} else {
				return {
					prompt:
						t('deduction.eliminationPrompt', {
							correct: selection[0],
							wrongA: selection[1],
							wrongB: selection[2]
						}) +
						' ' +
						t('deduction.eliminationExplain', { correct: selection[3] }),
					answer: selection[0] as string,
					distractors: [selection[1] as string, selection[2] as string, selection[3] as string],
					explanation: t('deduction.eliminationExplain', { correct: selection[0] })
				};
			}
		}
		case 'true_false_clue': {
			const [truth, falsehood, third] = rng.shuffle(people).slice(0, 3) as [string, string, string];
			if (difficulty === 'easy') {
				return {
					prompt: t('deduction.truthPrompt', { truth, falsehood }),
					answer: truth,
					distractors: [falsehood, t('deduction.both'), t('deduction.neither')],
					explanation: t('deduction.truthExplain', { truth })
				};
			} else {
				return {
					prompt:
						t('deduction.truthPrompt', { truth, falsehood }) +
						' ' +
						t('deduction.truthExplain', { truth: third }),
					answer: truth,
					distractors: [falsehood, third, t('deduction.neither')],
					explanation: t('deduction.truthExplain', { truth })
				};
			}
		}
		case 'position_reasoning': {
			const [left, middle, right, farRight] = rng.shuffle(people).slice(0, 4) as [
				string,
				string,
				string,
				string
			];
			if (difficulty === 'easy') {
				return {
					prompt: t('deduction.positionPrompt', { left, middle, right }),
					answer: middle,
					distractors: [left, right, t('arena.cannotDetermine')],
					explanation: t('deduction.positionExplain', { middle })
				};
			} else {
				return {
					prompt:
						t('deduction.positionPrompt', { left, middle, right }) +
						' ' +
						t('deduction.positionExplain', { middle: farRight }),
					answer: middle,
					distractors: [left, right, farRight, t('arena.cannotDetermine')],
					explanation: t('deduction.positionExplain', { middle })
				};
			}
		}
	}
}
