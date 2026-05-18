import { createChoices, createNumericDistractors } from '$lib/server/challenge/choice-generator';
import { resolveDifficultyScore } from '$lib/server/challenge/difficulty-resolver';
import { createSeededRng } from '$lib/server/challenge/random/seeded-rng';
import { validateGeneratedQuestion } from '$lib/server/challenge/rule-validator';
import type { GeneratedQuestion, GenerateQuestionInput } from '$lib/server/challenge/types';

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
	const sequence = buildSequence(input.ruleType as NumberRule, rng);
	const correctAnswer = sequence.answer;
	const choices = createChoices({
		correctAnswer: String(correctAnswer),
		distractors: createNumericDistractors({
			correctAnswer,
			rng,
			excluded: sequence.visible,
			spread: sequence.spread
		}),
		rng
	});

	return validateGeneratedQuestion({
		questionType: 'number_sequence',
		prompt: `Find the next number: ${sequence.visible.join(', ')}, ?`,
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
			sequence: sequence.visible,
			difficulty: input.difficulty
		},
		generatedSeed: input.seed
	});
}

function buildSequence(rule: NumberRule, rng: ReturnType<typeof createSeededRng>) {
	switch (rule) {
		case 'arithmetic_sequence': {
			const start = rng.intBetween(1, 12);
			const step = rng.intBetween(2, 9);
			const visible = Array.from({ length: 5 }, (_, index) => start + step * index);
			return {
				visible,
				answer: start + step * 5,
				spread: step * 3,
				explanation: `Arithmetic sequence: add ${step} each time.`
			};
		}
		case 'geometric_sequence': {
			const start = rng.intBetween(1, 5);
			const factor = rng.intBetween(2, 4);
			const visible = Array.from({ length: 5 }, (_, index) => start * factor ** index);
			return {
				visible,
				answer: start * factor ** 5,
				spread: factor * 10,
				explanation: `Geometric sequence: multiply by ${factor} each time.`
			};
		}
		case 'square_number': {
			const start = rng.intBetween(1, 5);
			const visible = Array.from({ length: 5 }, (_, index) => (start + index) ** 2);
			return {
				visible,
				answer: (start + 5) ** 2,
				spread: 20,
				explanation: `Square number sequence: each value is a consecutive square.`
			};
		}
		case 'fibonacci_like': {
			const first = rng.intBetween(1, 7);
			const second = rng.intBetween(2, 9);
			const values = [first, second];
			while (values.length < 6) {
				values.push((values.at(-1) ?? 0) + (values.at(-2) ?? 0));
			}
			return {
				visible: values.slice(0, 5),
				answer: values[5] as number,
				spread: 12,
				explanation: 'Fibonacci-like sequence: each value is the sum of the previous two values.'
			};
		}
		case 'alternating_sequence': {
			const start = rng.intBetween(2, 12);
			const add = rng.intBetween(3, 8);
			const subtract = rng.intBetween(1, 4);
			const visible = [start];
			for (let index = 1; index < 6; index += 1) {
				const previous = visible[index - 1] as number;
				visible.push(index % 2 === 1 ? previous + add : previous - subtract);
			}
			return {
				visible: visible.slice(0, 5),
				answer: visible[5] as number,
				spread: add + subtract + 5,
				explanation: `Alternating sequence: add ${add}, then subtract ${subtract}, and repeat.`
			};
		}
		case 'increasing_difference': {
			const start = rng.intBetween(1, 8);
			const firstStep = rng.intBetween(1, 4);
			const visible = [start];
			let step = firstStep;
			for (let index = 1; index < 6; index += 1) {
				visible.push((visible[index - 1] as number) + step);
				step += 1;
			}
			return {
				visible: visible.slice(0, 5),
				answer: visible[5] as number,
				spread: 12,
				explanation: `Increasing difference sequence: the added amount starts at ${firstStep} and increases by 1.`
			};
		}
	}
}
