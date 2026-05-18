import { createChoices } from '$lib/server/challenge/choice-generator';
import { resolveDifficultyScore } from '$lib/server/challenge/difficulty-resolver';
import { createSeededRng } from '$lib/server/challenge/random/seeded-rng';
import { validateGeneratedQuestion } from '$lib/server/challenge/rule-validator';
import type { GeneratedQuestion, GenerateQuestionInput } from '$lib/server/challenge/types';

export const MEMORY_PATTERN_RULES = [
	'symbol_recall',
	'position_recall',
	'sequence_recall',
	'missing_element_recall',
	'reverse_sequence_recall'
] as const;

const MEMORY_SYMBOLS = ['circle', 'square', 'triangle', 'diamond', 'star', 'hex'];

type MemoryRule = (typeof MEMORY_PATTERN_RULES)[number];

export function generateMemoryPatternQuestion(input: GenerateQuestionInput): GeneratedQuestion {
	if (!MEMORY_PATTERN_RULES.includes(input.ruleType as MemoryRule)) {
		throw new Error(`Unsupported memory pattern rule: ${input.ruleType}`);
	}

	const rng = createSeededRng(`${input.seed}:memory`);
	const challenge = buildMemoryChallenge(input.ruleType as MemoryRule, rng);
	const choices = createChoices({
		correctAnswer: challenge.answer,
		distractors: challenge.distractors,
		rng
	});

	return validateGeneratedQuestion({
		questionType: 'memory_pattern',
		prompt: challenge.prompt,
		choices,
		correctAnswer: challenge.answer,
		explanation: challenge.explanation,
		difficultyScore: resolveDifficultyScore({
			difficulty: input.difficulty,
			offset: rng.intBetween(0, 40)
		}),
		timeLimitSeconds: input.timeLimitSeconds,
		metadata: {
			ruleType: input.ruleType,
			memorize: challenge.memorize,
			revealSeconds: challenge.revealSeconds,
			difficulty: input.difficulty
		},
		generatedSeed: input.seed
	});
}

function buildMemoryChallenge(rule: MemoryRule, rng: ReturnType<typeof createSeededRng>) {
	const sequence = Array.from({ length: 5 }, () => rng.pick(MEMORY_SYMBOLS));
	const revealSeconds = 4;

	switch (rule) {
		case 'symbol_recall': {
			const index = rng.intBetween(0, sequence.length - 1);
			return {
				memorize: sequence,
				revealSeconds,
				prompt: `Memorize the sequence, then answer: what was symbol ${index + 1}?`,
				answer: sequence[index] as string,
				distractors: MEMORY_SYMBOLS,
				explanation: `Symbol recall: symbol ${index + 1} was ${sequence[index]}.`
			};
		}
		case 'position_recall': {
			const target = rng.pick([...new Set(sequence)]);
			return {
				memorize: sequence,
				revealSeconds,
				prompt: `Memorize the sequence, then answer: what is the first position of ${target}?`,
				answer: String(sequence.indexOf(target) + 1),
				distractors: ['1', '2', '3', '4', '5'],
				explanation: `Position recall: ${target} first appeared at position ${sequence.indexOf(target) + 1}.`
			};
		}
		case 'sequence_recall':
			return {
				memorize: sequence,
				revealSeconds,
				prompt: 'Memorize the sequence, then choose the exact sequence.',
				answer: sequence.join(' > '),
				distractors: [
					rng.shuffle(sequence).join(' > '),
					[...sequence].reverse().join(' > '),
					rng.shuffle(MEMORY_SYMBOLS).slice(0, 5).join(' > ')
				],
				explanation: 'Sequence recall: the selected answer matches the original order.'
			};
		case 'missing_element_recall': {
			const index = rng.intBetween(0, sequence.length - 1);
			return {
				memorize: sequence,
				revealSeconds,
				prompt: `Memorize the sequence. Hidden sequence: ${sequence
					.map((value, valueIndex) => (valueIndex === index ? '?' : value))
					.join(' > ')}. What is missing?`,
				answer: sequence[index] as string,
				distractors: MEMORY_SYMBOLS,
				explanation: `Missing element recall: the hidden position contained ${sequence[index]}.`
			};
		}
		case 'reverse_sequence_recall':
			return {
				memorize: sequence,
				revealSeconds,
				prompt: 'Memorize the sequence, then choose it in reverse order.',
				answer: [...sequence].reverse().join(' > '),
				distractors: [
					sequence.join(' > '),
					rng.shuffle(sequence).join(' > '),
					rng.shuffle(MEMORY_SYMBOLS).slice(0, 5).join(' > ')
				],
				explanation: 'Reverse sequence recall: the answer reverses the original order.'
			};
	}
}
