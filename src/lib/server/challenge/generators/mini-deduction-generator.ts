import { createChoices } from '$lib/server/challenge/choice-generator';
import { resolveDifficultyScore } from '$lib/server/challenge/difficulty-resolver';
import { createSeededRng } from '$lib/server/challenge/random/seeded-rng';
import { validateGeneratedQuestion } from '$lib/server/challenge/rule-validator';
import type { GeneratedQuestion, GenerateQuestionInput } from '$lib/server/challenge/types';

export const MINI_DEDUCTION_RULES = [
	'comparison_chain',
	'object_ordering',
	'simple_elimination',
	'true_false_clue',
	'position_reasoning'
] as const;

const PEOPLE = ['Ari', 'Bima', 'Citra', 'Deni'];
const OBJECTS = ['red cube', 'blue cube', 'green cube', 'yellow cube'];

type DeductionRule = (typeof MINI_DEDUCTION_RULES)[number];

export function generateMiniDeductionQuestion(input: GenerateQuestionInput): GeneratedQuestion {
	if (!MINI_DEDUCTION_RULES.includes(input.ruleType as DeductionRule)) {
		throw new Error(`Unsupported mini deduction rule: ${input.ruleType}`);
	}

	const rng = createSeededRng(`${input.seed}:deduction`);
	const puzzle = buildPuzzle(input.ruleType as DeductionRule, rng);
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

function buildPuzzle(rule: DeductionRule, rng: ReturnType<typeof createSeededRng>) {
	switch (rule) {
		case 'comparison_chain': {
			const [first, second, third] = rng.shuffle(PEOPLE).slice(0, 3) as [string, string, string];
			return {
				prompt: `${first} solved more puzzles than ${second}. ${second} solved more puzzles than ${third}. Who solved the most?`,
				answer: first,
				distractors: [second, third, 'Cannot be determined'],
				explanation: `Comparison chain: ${first} is above ${second}, and ${second} is above ${third}.`
			};
		}
		case 'object_ordering': {
			const [first, second, third] = rng.shuffle(OBJECTS).slice(0, 3) as [string, string, string];
			return {
				prompt: `The ${first} is left of the ${second}. The ${second} is left of the ${third}. Which cube is in the middle?`,
				answer: second,
				distractors: [first, third, 'Cannot be determined'],
				explanation: `Object ordering: the order is ${first}, ${second}, then ${third}.`
			};
		}
		case 'simple_elimination': {
			const [correct, wrongA, wrongB] = rng.shuffle(PEOPLE).slice(0, 3) as [string, string, string];
			return {
				prompt: `${wrongA} did not take the key. ${wrongB} did not take the key. Only ${correct}, ${wrongA}, and ${wrongB} were in the room. Who took the key?`,
				answer: correct,
				distractors: [wrongA, wrongB, 'Cannot be determined'],
				explanation: `Simple elimination: the two named alternatives are ruled out, leaving ${correct}.`
			};
		}
		case 'true_false_clue': {
			const [truth, falsehood] = rng.shuffle(PEOPLE).slice(0, 2) as [string, string];
			return {
				prompt: `${truth} says "the switch is on." ${falsehood} says "the switch is off." Exactly one statement is true, and the switch is on. Who told the truth?`,
				answer: truth,
				distractors: [falsehood, 'Both', 'Neither'],
				explanation: `True or false clue: the switch is on, so ${truth}'s statement is true.`
			};
		}
		case 'position_reasoning': {
			const [left, middle, right] = rng.shuffle(PEOPLE).slice(0, 3) as [string, string, string];
			return {
				prompt: `${left} stands immediately left of ${middle}. ${right} stands immediately right of ${middle}. Who stands in the center?`,
				answer: middle,
				distractors: [left, right, 'Cannot be determined'],
				explanation: `Position reasoning: ${middle} has one person immediately on each side.`
			};
		}
	}
}
