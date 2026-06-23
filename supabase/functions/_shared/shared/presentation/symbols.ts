const TRIANGLE_DIRECTIONS = ['up', 'right', 'down', 'left'] as const;
const SIMPLE_VISUAL_SYMBOLS = ['circle', 'square', 'diamond', 'star'] as const;

type TriangleDirection = (typeof TRIANGLE_DIRECTIONS)[number];
type TriangleToken = `triangle-${TriangleDirection}`;
type SimpleVisualSymbol = (typeof SIMPLE_VISUAL_SYMBOLS)[number];
export type VisualSymbolToken = TriangleToken | SimpleVisualSymbol;

export type SymbolPrompt = {
	instruction: string;
	tokens: string[];
};

export function parseSymbolPrompt(
	prompt: string,
	locale: Locale = DEFAULT_LOCALE
): SymbolPrompt | null {
	const match = /^[^:]+:\s*(.+)$/u.exec(prompt.trim());
	if (!match) {
		if (import.meta.env?.DEV)
			console.warn(`[I18N] Missing translation for symbol prompt: ${prompt}`);
		return null;
	}

	const tokens = match[1].split('|').map((token) => token.trim());
	if (tokens.length < 2 || tokens.some((token) => token.length === 0)) return null;

	return {
		instruction: translate(locale, 'question.nextSymbol'),
		tokens
	};
}

export function isVisualSymbolToken(token: string): token is VisualSymbolToken {
	if (SIMPLE_VISUAL_SYMBOLS.includes(token as SimpleVisualSymbol)) return true;
	if (!token.startsWith('triangle-')) return false;
	return TRIANGLE_DIRECTIONS.includes(token.slice('triangle-'.length) as TriangleDirection);
}

export function labelSymbolToken(token: string, locale: Locale = DEFAULT_LOCALE): string {
	if (token.startsWith('triangle-') && isVisualSymbolToken(token)) {
		const dirMap: Record<string, MessageKey> = {
			up: 'direction.up',
			right: 'direction.right',
			down: 'direction.down',
			left: 'direction.left'
		};
		const dir = token.slice('triangle-'.length);
		return translate(locale, 'symbol.facing', {
			shape: translate(locale, 'symbol.triangle'),
			direction: dirMap[dir] ? translate(locale, dirMap[dir]) : dir
		});
	}
	if (token === '?') return translate(locale, 'symbol.unknown');

	const idMap: Record<string, MessageKey> = {
		circle: 'symbol.circle',
		square: 'symbol.square',
		triangle: 'symbol.triangle',
		diamond: 'symbol.diamond',
		star: 'symbol.star',
		hex: 'symbol.hex'
	};
	if (idMap[token]) return translate(locale, idMap[token]);

	const words = token.replaceAll(/[-_]+/g, ' ').trim();
	return words.length === 0
		? translate(locale, 'symbol.generic')
		: words.charAt(0).toUpperCase() + words.slice(1);
}

export function symbolRotation(token: string): number {
	if (!token.startsWith('triangle-') || !isVisualSymbolToken(token)) return 0;
	const direction = token.slice('triangle-'.length) as TriangleDirection;
	return {
		up: 0,
		right: 90,
		down: 180,
		left: 270
	}[direction];
}
import { DEFAULT_LOCALE, translate, type Locale, type MessageKey } from '../../i18n/index.ts';
