export function normalizeTextAnswer(value: string): string {
	return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

export function normalizeSymbolAnswer(value: string): string {
	return value.trim().replace(/\s+/g, ' ');
}

export function normalizeAnswer(value: string, options: { exactSymbols?: boolean } = {}): string {
	return options.exactSymbols ? normalizeSymbolAnswer(value) : normalizeTextAnswer(value);
}

export function answersMatch(
	left: string,
	right: string,
	options: { exactSymbols?: boolean } = {}
): boolean {
	return normalizeAnswer(left, options) === normalizeAnswer(right, options);
}
