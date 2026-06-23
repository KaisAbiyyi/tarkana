import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SymbolGlyph from './SymbolGlyph.svelte';

describe('SymbolGlyph', () => {
	it('renders a supported triangle as an accessible visual', async () => {
		render(SymbolGlyph, { token: 'triangle-left', size: 'lg' });

		await expect
			.element(page.getByRole('img', { name: 'Triangle facing left' }))
			.toBeInTheDocument();
		await expect.element(page.getByText('triangle-left')).not.toBeInTheDocument();
	});

	it('renders unknown tokens as readable fallback text', async () => {
		render(SymbolGlyph, { token: 'hexagon-blue' });

		await expect.element(page.getByText('Hexagon blue')).toBeInTheDocument();
	});

	it('renders simple generator shapes as accessible visuals', async () => {
		render(SymbolGlyph, { token: 'circle' });

		await expect.element(page.getByRole('img', { name: 'Circle' })).toBeInTheDocument();
		await expect.element(page.getByText('circle')).not.toBeInTheDocument();
	});
});
