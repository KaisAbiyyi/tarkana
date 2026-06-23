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

const MEMORY_SYMBOLS = ['circle', 'square', 'triangle', 'diamond', 'star', 'hex'];

type MemoryRule = (typeof MEMORY_PATTERN_RULES)[number];

export function generateMemoryPatternQuestion(input: GenerateQuestionInput): GeneratedQuestion {
	if (!MEMORY_PATTERN_RULES.includes(input.ruleType as MemoryRule)) {
		throw new Error(`Unsupported memory pattern rule: ${input.ruleType}`);
	}

	const rng = createSeededRng(`${input.seed}:memory`);
	const locale = resolveLocale(input.locale);
	const t = createTranslator(locale);
	const challenge = buildMemoryChallenge(input.ruleType as MemoryRule, rng, t, locale);
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
	locale: import('$lib/i18n').Locale
) {
	const sequence = Array.from({ length: 5 }, () => rng.pick(MEMORY_SYMBOLS));
	const revealSeconds = 4;

	switch (rule) {
		case 'symbol_recall': {
			const index = rng.intBetween(0, sequence.length - 1);
			return {
				memorize: sequence,
				revealSeconds,
				prompt: t('memory.symbolPrompt', { position: index + 1 }),
				answer: sequence[index] as string,
				distractors: MEMORY_SYMBOLS,
				explanation: t('memory.symbolExplain', {
					position: index + 1,
					symbol: labelSymbolToken(sequence[index] as string, locale)
				})
			};
		}
		case 'position_recall': {
			const target = rng.pick([...new Set(sequence)]);
			return {
				memorize: sequence,
				revealSeconds,
				prompt: t('memory.positionPrompt', { symbol: labelSymbolToken(target, locale) }),
				answer: String(sequence.indexOf(target) + 1),
				distractors: ['1', '2', '3', '4', '5'],
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
					rng.shuffle(MEMORY_SYMBOLS).slice(0, 5).join(' > ')
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
							valueIndex === index ? '?' : labelSymbolToken(value, locale)
						)
						.join(' > ')
				}),
				answer: sequence[index] as string,
				distractors: MEMORY_SYMBOLS,
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
					rng.shuffle(MEMORY_SYMBOLS).slice(0, 5).join(' > ')
				],
				explanation: t('memory.reverseExplain')
			};
	}
}
