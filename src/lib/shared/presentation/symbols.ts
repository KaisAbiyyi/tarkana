const TRIANGLE_DIRECTIONS = ['up', 'right', 'down', 'left'] as const;
const SIMPLE_VISUAL_SYMBOLS = ['circle', 'square', 'triangle', 'diamond', 'star'] as const;

type TriangleDirection = (typeof TRIANGLE_DIRECTIONS)[number];
type TriangleToken = `triangle-${TriangleDirection}`;
type SimpleVisualSymbol = (typeof SIMPLE_VISUAL_SYMBOLS)[number];
export type VisualSymbolToken = TriangleToken | SimpleVisualSymbol;

export type SymbolPrompt = {
	instruction: string;
	tokens: string[];
};

export function parseSymbolPrompt(prompt: string): SymbolPrompt | null {
	const match = /^Find the next symbol:\s*(.+)$/i.exec(prompt.trim());
	if (!match) return null;

	const tokens = match[1].split('|').map((token) => token.trim());
	if (tokens.length < 2 || tokens.some((token) => token.length === 0)) return null;

	return {
		instruction: 'Find the next symbol',
		tokens
	};
}

export function isVisualSymbolToken(token: string): token is VisualSymbolToken {
	if (SIMPLE_VISUAL_SYMBOLS.includes(token as SimpleVisualSymbol)) return true;
	if (!token.startsWith('triangle-')) return false;
	return TRIANGLE_DIRECTIONS.includes(token.slice('triangle-'.length) as TriangleDirection);
}

export function labelSymbolToken(token: string): string {
	if (token.startsWith('triangle-') && isVisualSymbolToken(token)) {
		return `Triangle pointing ${token.slice('triangle-'.length)}`;
	}
	if (token === '?') return 'Unknown symbol';

	const words = token.replaceAll(/[-_]+/g, ' ').trim();
	return words.length === 0 ? 'Symbol' : words.charAt(0).toUpperCase() + words.slice(1);
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
