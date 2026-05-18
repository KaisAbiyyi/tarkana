import { describe, expect, it } from 'vitest';
import { formatPercent, formatSeconds, formatSignedNumber, labelQuestionType } from './format';

describe('presentation format helpers', () => {
	it('formats percentage values as rounded whole percents', () => {
		expect(formatPercent(87.6)).toBe('88%');
	});

	it('formats short and long durations readably', () => {
		expect(formatSeconds(12.2)).toBe('12s');
		expect(formatSeconds(125)).toBe('2m 5s');
	});

	it('formats positive rating changes with a sign', () => {
		expect(formatSignedNumber(25)).toBe('+25');
		expect(formatSignedNumber(-10)).toBe('-10');
	});

	it('labels known question types with product copy', () => {
		expect(labelQuestionType('memory_pattern')).toBe('Memory Pattern');
	});
});
