import { describe, expect, it } from 'vitest';
import {
	createTranslator,
	DEFAULT_LOCALE,
	getTextDirection,
	isLocale,
	LOCALES,
	resolveLocale,
	translate
} from './index.ts';
import { localeIndexes, messages } from './messages.ts';

describe('i18n', () => {
	it('uses English as the default and rejects unsupported locales', () => {
		expect(DEFAULT_LOCALE).toBe('en');
		expect(resolveLocale('id')).toBe('id');
		expect(resolveLocale('xx')).toBe('en');
		expect(isLocale('ar')).toBe(true);
		expect(isLocale(null)).toBe(false);
	});

	it('interpolates translated messages', () => {
		expect(createTranslator('id')('demo.questionOf', { current: 4, total: 10 })).toBe(
			'Soal 4 dari 10'
		);
		expect(translate('en', 'leaderboard.rounds', { count: 3 })).toBe('3 rounds');
	});

	it('uses RTL only for Arabic', () => {
		expect(getTextDirection('ar')).toBe('rtl');
		expect(getTextDirection('id')).toBe('ltr');
	});

	it('has a non-empty translation with matching placeholders for every key and locale', () => {
		for (const row of Object.values(messages)) {
			expect(row).toHaveLength(LOCALES.length);
			const englishParams = [
				...new Set([...row[localeIndexes.en].matchAll(/\{(\w+)\}/g)].map((match) => match[1]))
			].sort();

			for (const locale of LOCALES) {
				const value = row[localeIndexes[locale]];
				expect(value.trim()).not.toBe('');
				expect(
					[...new Set([...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]))].sort()
				).toEqual(englishParams);
			}
		}
	});
});
