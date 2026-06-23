import { describe, expect, it } from 'vitest';
import { isVisualSymbolToken, labelSymbolToken, parseSymbolPrompt } from './symbols';

describe('symbol presentation', () => {
	it('parses a generated symbol prompt into instruction and stable tokens', () => {
		expect(
			parseSymbolPrompt('Find the next symbol: triangle-left | triangle-up | triangle-right | ?')
		).toEqual({
			instruction: 'Find the next symbol',
			tokens: ['triangle-left', 'triangle-up', 'triangle-right', '?']
		});
	});

	it('rejects malformed and ordinary prompts', () => {
		expect(parseSymbolPrompt('Find the next symbol: triangle-left || ?')).toBeNull();
		expect(parseSymbolPrompt('Find the next number: 2, 4, 6, ?')).toBeNull();
	});

	it('identifies supported visual tokens', () => {
		expect(isVisualSymbolToken('triangle-down')).toBe(true);
		expect(isVisualSymbolToken('circle')).toBe(true);
		expect(isVisualSymbolToken('star')).toBe(true);
		expect(isVisualSymbolToken('hexagon-blue')).toBe(false);
	});

	it('provides readable labels for known and unknown tokens', () => {
		expect(labelSymbolToken('triangle-left')).toBe('Triangle facing left');
		expect(labelSymbolToken('hexagon-blue')).toBe('Hexagon blue');
		expect(labelSymbolToken('?')).toBe('Unknown symbol');
	});
});
