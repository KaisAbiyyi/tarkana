import { createChoices } from '../../../server/challenge/choice-generator.ts';
import { resolveDifficultyScore } from '../../../server/challenge/difficulty-resolver.ts';
import { createSeededRng } from '../../../server/challenge/random/seeded-rng.ts';
import { validateGeneratedQuestion } from '../../../server/challenge/rule-validator.ts';
import type { GeneratedQuestion, GenerateQuestionInput } from '../../../server/challenge/types.ts';
import { createTranslator, resolveLocale } from '../../../i18n/index.ts';
import { labelSymbolToken } from '../../../shared/presentation/symbols.ts';

export const MEMORY_PATTERN_RULES = [
	'symbol_recall',
	'position_recall',
	'sequence_recall',
	'missing_element_recall',
	'reverse_sequence_recall'
] as const;

const ALL_MEMORY_SYMBOLS = [
	'circle',
	'square',
	'triangle',
	'diamond',
	'star',
	'hex',
	'pentagon',
	'octagon'
];

type MemoryRule = (typeof MEMORY_PATTERN_RULES)[number];

export function generateMemoryPatternQuestion(input: GenerateQuestionInput): GeneratedQuestion {
	if (!MEMORY_PATTERN_RULES.includes(input.ruleType as MemoryRule)) {
		throw new Error(`Unsupported memory pattern rule: ${input.ruleType}`);
	}

	const rng = createSeededRng(`${input.seed}:memory`);
	const locale = resolveLocale(input.locale);
	const t = createTranslator(locale);
	const challenge = buildMemoryChallenge(
		input.ruleType as MemoryRule,
		rng,
		t,
		locale,
		input.difficulty
	);
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

function buildMemoryChallenge(
	rule: MemoryRule,
	rng: ReturnType<typeof createSeededRng>,
	t: import('$lib/i18n').Translator,
	locale: import('$lib/i18n').Locale,
	difficulty: 'easy' | 'medium' | 'hard'
) {
	// Sequence length: 5 / 6 / 7
	const seqLength = difficulty === 'hard' ? 7 : difficulty === 'medium' ? 6 : 5;
	// Reveal time: 4 / 3 / 2
	const revealSeconds = difficulty === 'hard' ? 2 : difficulty === 'medium' ? 3 : 4;
	// Symbol pool: 4 / 6 / 8
	const poolSize = difficulty === 'hard' ? 8 : difficulty === 'medium' ? 6 : 4;

	const activePool = ALL_MEMORY_SYMBOLS.slice(0, poolSize);

	// Default sequence generation
	let sequence = Array.from({ length: seqLength }, () => rng.pick(activePool));

	// For position_recall, target must appear exactly once!
	if (rule === 'position_recall') {
		const target = rng.pick(activePool);
		const nonTargets = activePool.filter((s) => s !== target);

		// Ensure nonTargets are used for the rest
		sequence = Array.from({ length: seqLength }, () => rng.pick(nonTargets));
		// Inject target exactly once
		const targetIndex = rng.intBetween(0, seqLength - 1);
		sequence[targetIndex] = target;
	}

	switch (rule) {
		case 'symbol_recall': {
			const index = rng.intBetween(0, sequence.length - 1);
			return {
				memorize: sequence,
				revealSeconds,
				prompt: t('memory.symbolPrompt', { position: index + 1 }),
				answer: sequence[index] as string,
				distractors: activePool,
				explanation: t('memory.symbolExplain', {
					position: index + 1,
					symbol: labelSymbolToken(sequence[index] as string, locale)
				})
			};
		}
		case 'position_recall': {
			// Find the single instance of the target we ensured above
			const targetIndex = sequence.findIndex(
				(s, index, arr) => arr.indexOf(s) === arr.lastIndexOf(s)
			);
			// Fallback in case rng matched perfectly, which won't happen because we forced it
			const target = sequence[targetIndex !== -1 ? targetIndex : 0] as string;

			return {
				memorize: sequence,
				revealSeconds,
				prompt: t('memory.positionPrompt', { symbol: labelSymbolToken(target, locale) }),
				answer: String(sequence.indexOf(target) + 1),
				distractors: Array.from({ length: seqLength }, (_, i) => String(i + 1)),
				explanation: t('memory.positionExplain', {
					symbol: labelSymbolToken(target, locale),
					position: sequence.indexOf(target) + 1
				})
			};
		}
		case 'sequence_recall':
			return {
				memorize: sequence,
				revealSeconds,
				prompt: t('memory.exactPrompt'),
				answer: sequence.join(' > '),
				distractors: [
					rng.shuffle(sequence).join(' > '),
					[...sequence].reverse().join(' > '),
					rng.shuffle(activePool).slice(0, seqLength).join(' > ')
				],
				explanation: t('memory.exactExplain')
			};
		case 'missing_element_recall': {
			const index = rng.intBetween(0, sequence.length - 1);
			return {
				memorize: sequence,
				revealSeconds,
				prompt: t('memory.missingPrompt', {
					sequence: sequence
						.map((value, valueIndex) =>
							valueIndex === index ? '?' : labelSymbolToken(value as string, locale)
						)
						.join(' > ')
				}),
				answer: sequence[index] as string,
				distractors: activePool,
				explanation: t('memory.missingExplain', {
					symbol: labelSymbolToken(sequence[index] as string, locale)
				})
			};
		}
		case 'reverse_sequence_recall':
			return {
				memorize: sequence,
				revealSeconds,
				prompt: t('memory.reversePrompt'),
				answer: [...sequence].reverse().join(' > '),
				distractors: [
					sequence.join(' > '),
					rng.shuffle(sequence).join(' > '),
					rng.shuffle(activePool).slice(0, seqLength).join(' > ')
				],
				explanation: t('memory.reverseExplain')
			};
	}
}
