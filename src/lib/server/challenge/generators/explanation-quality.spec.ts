import { describe, expect, it } from 'vitest';
import { generateNumberSequenceQuestion } from './number-sequence-generator';
import { generateSymbolPatternQuestion } from './symbol-pattern-generator';
import { generateMiniDeductionQuestion, MINI_DEDUCTION_RULES } from './mini-deduction-generator';
import { LOCALES } from '$lib/i18n/locales';
import { createTranslator } from '$lib/i18n';

describe('P1.9 Generator Explanation & Prompt Quality', () => {
	describe('Mini-Deduction Prompt and Explanation Construction', () => {
		it('generates coherent multi-step premises and explanations without string splitting', () => {
			for (const ruleType of MINI_DEDUCTION_RULES) {
				for (const difficulty of ['easy', 'medium', 'hard'] as const) {
					for (let i = 0; i < 5; i++) {
						const q = generateMiniDeductionQuestion({
							ruleType,
							difficulty,
							seed: `seed-deduction-${ruleType}-${difficulty}-${i}`,
							timeLimitSeconds: 30,
							locale: 'en'
						});

						// Never return 'Combined logic.'
						expect(q.explanation).not.toContain('Combined logic.');

						// Prompt must be non-empty and well-formed
						expect(q.prompt.length).toBeGreaterThan(15);
						expect(q.prompt).not.toContain('undefined');
						expect(q.prompt).not.toContain('{');
						expect(q.prompt).not.toContain('}');

						// Explanation must be non-empty and have no unresolved placeholders
						expect(q.explanation.length).toBeGreaterThan(10);
						expect(q.explanation).not.toContain('{');
						expect(q.explanation).not.toContain('}');

						// Correct answer must match deductionTarget
						expect(q.correctAnswer).toBe(q.metadata?.deductionTarget);
					}
				}
			}
		});

		it('translates mini-deductions across all 12 locales without missing placeholders', () => {
			for (const locale of LOCALES) {
				const q = generateMiniDeductionQuestion({
					ruleType: 'comparison_chain',
					difficulty: 'hard',
					seed: `seed-locales-${locale}`,
					timeLimitSeconds: 30,
					locale
				});

				expect(q.prompt).not.toContain('{');
				expect(q.prompt).not.toContain('}');
				expect(q.explanation).not.toContain('{');
				expect(q.explanation).not.toContain('}');
			}
		});
	});

	describe('Number Sequence Explanation Precision', () => {
		it('explains cubes distinctly from squares on hard difficulty', () => {
			const qHard = generateNumberSequenceQuestion({
				ruleType: 'square_number',
				difficulty: 'hard',
				seed: 'cube-test-seed-1',
				timeLimitSeconds: 30,
				locale: 'en'
			});

			expect(qHard.explanation).toContain('Cube');
			expect(qHard.explanation).not.toContain('{');

			const qEasy = generateNumberSequenceQuestion({
				ruleType: 'square_number',
				difficulty: 'easy',
				seed: 'square-test-seed-1',
				timeLimitSeconds: 30,
				locale: 'en'
			});

			expect(qEasy.explanation).toContain('Square');
		});

		it('explains alternating multiply-add accurately on hard difficulty', () => {
			const q = generateNumberSequenceQuestion({
				ruleType: 'alternating_sequence',
				difficulty: 'hard',
				seed: 'alt-mult-seed-1',
				timeLimitSeconds: 30,
				locale: 'en'
			});

			expect(q.explanation).toMatch(/multiply by \d+, add \d+/i);
			expect(q.explanation).not.toContain('{');
		});

		it('explains increasing step differences accurately when acceleration step > 1', () => {
			const q = generateNumberSequenceQuestion({
				ruleType: 'increasing_difference',
				difficulty: 'hard',
				seed: 'inc-step-seed-2',
				timeLimitSeconds: 30,
				locale: 'en'
			});

			expect(q.explanation).toMatch(/grow by \d+ each step|grow by 1/i);
			expect(q.explanation).not.toContain('{');
		});
	});

	describe('Symbol Pattern Explanation Precision', () => {
		it('parameterizes cycle count accurately in repeating_cycle', () => {
			const qEasy = generateSymbolPatternQuestion({
				ruleType: 'repeating_cycle',
				difficulty: 'easy',
				seed: 'rep-cycle-easy',
				timeLimitSeconds: 30,
				locale: 'en'
			});
			expect(qEasy.explanation).toContain('2-symbol sequence');

			const qMed = generateSymbolPatternQuestion({
				ruleType: 'repeating_cycle',
				difficulty: 'medium',
				seed: 'rep-cycle-med',
				timeLimitSeconds: 30,
				locale: 'en'
			});
			expect(qMed.explanation).toContain('3-symbol sequence');

			const qHard = generateSymbolPatternQuestion({
				ruleType: 'repeating_cycle',
				difficulty: 'hard',
				seed: 'rep-cycle-hard',
				timeLimitSeconds: 30,
				locale: 'en'
			});
			expect(qHard.explanation).toContain('4-symbol sequence');
		});

		it('explains multi-step rotation when step > 1', () => {
			const qHard = generateSymbolPatternQuestion({
				ruleType: 'symbol_rotation',
				difficulty: 'hard',
				seed: 'rotation-hard-seed',
				timeLimitSeconds: 30,
				locale: 'en'
			});
			expect(qHard.explanation).toContain('2 steps');
		});
	});

	describe('Result Review UI Translations', () => {
		it('renders all review UI keys across sample locales: en, id, ja, ar', () => {
			const testLocales = ['en', 'id', 'ja', 'ar'] as const;
			for (const loc of testLocales) {
				const t = createTranslator(loc);
				expect(t('result.filterAll', { total: 10 })).toBeTruthy();
				expect(t('result.filterMissed', { count: 3 })).toBeTruthy();
				expect(t('result.filterCorrect', { count: 7 })).toBeTruthy();
				expect(t('result.timedOut')).toBeTruthy();
				expect(t('result.yourChoiceCorrect')).toBeTruthy();
				expect(t('result.yourChoiceWrong')).toBeTruthy();
				expect(t('result.correctChoice')).toBeTruthy();
				expect(t('result.difficulty', { score: 1200 })).toBeTruthy();
				expect(t('result.scoreEarned', { score: 150 })).toBeTruthy();
				expect(t('result.categoryBreakdownTitle')).toBeTruthy();
				expect(t('result.categoryBreakdownSubtitle')).toBeTruthy();
				expect(t('result.strongestCategory')).toBeTruthy();
				expect(t('result.weakestCategory')).toBeTruthy();
				expect(t('result.singleCategoryRound')).toBeTruthy();
				expect(t('result.practiceWeakestCta', { category: 'Number Sequence' })).toBeTruthy();
			}
		});
	});
});
