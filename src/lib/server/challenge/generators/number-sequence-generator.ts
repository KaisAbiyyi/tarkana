import { createChoices, createNumericDistractors } from '$lib/server/challenge/choice-generator';
import { resolveDifficultyScore } from '$lib/server/challenge/difficulty-resolver';
import { createSeededRng } from '$lib/server/challenge/random/seeded-rng';
import { validateGeneratedQuestion } from '$lib/server/challenge/rule-validator';
import type { GeneratedQuestion, GenerateQuestionInput } from '$lib/server/challenge/types';
import { createTranslator, resolveLocale } from '$lib/i18n';

export const NUMBER_SEQUENCE_RULES = [
	'arithmetic_sequence',
	'geometric_sequence',
	'square_number',
	'fibonacci_like',
	'alternating_sequence',
	'increasing_difference'
] as const;

type NumberRule = (typeof NUMBER_SEQUENCE_RULES)[number];

export function generateNumberSequenceQuestion(input: GenerateQuestionInput): GeneratedQuestion {
	if (!NUMBER_SEQUENCE_RULES.includes(input.ruleType as NumberRule)) {
		throw new Error(`Unsupported number sequence rule: ${input.ruleType}`);
	}

	const rng = createSeededRng(`${input.seed}:number`);
	const t = createTranslator(resolveLocale(input.locale));
	const sequence = buildSequence(input.ruleType as NumberRule, rng, t, input.difficulty);
	const correctAnswer = sequence.answer;
	const excludedNumbers = sequence.visibleArr.filter((v): v is number => typeof v === 'number');

	const choices = createChoices({
		correctAnswer: String(correctAnswer),
		distractors: createNumericDistractors({
			correctAnswer,
			rng,
			excluded: excludedNumbers,
			spread: sequence.spread
		}),
		rng
	});

	return validateGeneratedQuestion({
		questionType: 'number_sequence',
		prompt: t('question.nextNumber', { sequence: sequence.displaySequence }),
		choices,
		correctAnswer: String(correctAnswer),
		explanation: sequence.explanation,
		difficultyScore: resolveDifficultyScore({
			difficulty: input.difficulty,
			min: Number(input.config?.difficultyMin),
			max: Number(input.config?.difficultyMax),
			offset: rng.intBetween(0, 40)
		}),
		timeLimitSeconds: input.timeLimitSeconds,
		metadata: {
			ruleType: input.ruleType,
			sequence: sequence.visibleArr,
			difficulty: input.difficulty
		},
		generatedSeed: input.seed
	});
}

function buildSequence(
	rule: NumberRule,
	rng: ReturnType<typeof createSeededRng>,
	t: import('$lib/i18n').Translator,
	difficulty: 'easy' | 'medium' | 'hard'
) {
	// Base properties that change based on difficulty
	const allowMiddleMissing = difficulty === 'medium' || difficulty === 'hard';
	const allowNegative = difficulty === 'hard' || (difficulty === 'medium' && rng.boolean());

	const formatResult = (
		values: number[],
		answerIndex: number,
		spread: number,
		explanation: string
	) => {
		const visibleArr = values.map((v, i) => (i === answerIndex ? '?' : v));
		return {
			visibleArr,
			displaySequence: visibleArr.join(', '),
			answer: values[answerIndex] as number,
			spread,
			explanation
		};
	};

	switch (rule) {
		case 'arithmetic_sequence': {
			const isNegative = allowNegative ? rng.boolean() : false;
			const start = rng.intBetween(1, 20) * (isNegative ? -1 : 1);
			const step = rng.intBetween(2, 12) * (isNegative ? -1 : 1);

			const values = Array.from({ length: 6 }, (_, index) => start + step * index);
			const answerIndex = allowMiddleMissing && rng.boolean() ? rng.intBetween(3, 4) : 5;

			return formatResult(
				values,
				answerIndex,
				Math.abs(step) * 3,
				t('explain.arithmetic', { step })
			);
		}
		case 'geometric_sequence': {
			const isNegative = allowNegative ? rng.boolean() : false;
			const start = rng.intBetween(1, 5) * (isNegative ? -1 : 1);
			const factor = difficulty === 'hard' ? rng.intBetween(3, 5) : rng.intBetween(2, 3);
			const factorSign = allowNegative && rng.boolean() ? -1 : 1;
			const finalFactor = factor * factorSign;

			const values = Array.from({ length: 6 }, (_, index) => start * finalFactor ** index);
			const answerIndex = allowMiddleMissing && rng.boolean() ? rng.intBetween(3, 4) : 5;

			return formatResult(
				values,
				answerIndex,
				Math.abs(finalFactor) * 10,
				t('explain.geometric', { factor: finalFactor })
			);
		}
		case 'square_number': {
			const start = rng.intBetween(1, 10);
			const isCube = difficulty === 'hard';
			const power = isCube ? 3 : 2;
			const step = difficulty === 'medium' ? rng.intBetween(2, 3) : 1;

			const values = Array.from({ length: 6 }, (_, index) => (start + index * step) ** power);
			const answerIndex = allowMiddleMissing && rng.boolean() ? rng.intBetween(3, 4) : 5;

			return formatResult(
				values,
				answerIndex,
				20 * step,
				t((isCube ? 'explain.cube' : 'explain.square') as any)
			);
		}
		case 'fibonacci_like': {
			const first = rng.intBetween(1, 7);
			const second = rng.intBetween(2, 9);
			const addends = difficulty === 'hard' ? rng.intBetween(1, 3) : 0; // a_n = a_{n-1} + a_{n-2} + addends

			const values = [first, second];
			while (values.length < 6) {
				values.push((values.at(-1) ?? 0) + (values.at(-2) ?? 0) + addends);
			}
			const answerIndex = allowMiddleMissing && rng.boolean() ? rng.intBetween(4, 5) : 5; // Less likely to be early for fibonacci

			return formatResult(values, answerIndex, 15, t('explain.fibonacci'));
		}
		case 'alternating_sequence': {
			const start = rng.intBetween(2, 12);
			const add = rng.intBetween(3, 10);
			const subtract = difficulty === 'easy' ? rng.intBetween(1, 4) : rng.intBetween(2, 8);
			const isMultiplyAdd = difficulty === 'hard'; // Instead of +/- it's * / +

			const values = [start];
			for (let index = 1; index < 6; index += 1) {
				const previous = values[index - 1] as number;
				if (isMultiplyAdd) {
					values.push(index % 2 === 1 ? previous * Math.max(2, add % 4) : previous + subtract);
				} else {
					values.push(index % 2 === 1 ? previous + add : previous - subtract);
				}
			}
			const answerIndex = allowMiddleMissing && rng.boolean() ? rng.intBetween(3, 4) : 5;

			return formatResult(
				values,
				answerIndex,
				add + subtract + 5,
				t('explain.alternating', { add, subtract })
			);
		}
		case 'increasing_difference': {
			const start = rng.intBetween(1, 8);
			const firstStep = rng.intBetween(1, 4);
			const stepIncrease = difficulty === 'easy' ? 1 : rng.intBetween(2, 4);

			const values = [start];
			let currentStep = firstStep;
			for (let index = 1; index < 6; index += 1) {
				values.push((values[index - 1] as number) + currentStep);
				currentStep += stepIncrease;
			}
			const answerIndex = allowMiddleMissing && rng.boolean() ? rng.intBetween(3, 4) : 5;

			return formatResult(values, answerIndex, 20, t('explain.increasing', { step: firstStep }));
		}
	}
}
