import { describe, expect, it } from 'vitest';
import { renderDuelCardPng, renderDuelCardSvg } from './render-duel-card';

describe('renderDuelCard', () => {
	const mockDuelOptions = {
		creatorDisplayName: 'PuzzleKnight',
		sourceChallengeType: 'standard' as const,
		totalQuestions: 10,
		appOrigin: 'https://play.tarkana.io'
	};

	it('renders valid Blind Duel SVG containing challenger name and mode, strictly concealing scores', () => {
		const svg = renderDuelCardSvg(mockDuelOptions);

		expect(svg).toContain('TARKANA');
		expect(svg).toContain('ASYNC LOGIC DUEL');
		expect(svg).toContain('PuzzleKnight challenged you to a duel!');
		expect(svg).toContain('STANDARD LOGIC');
		expect(svg).toContain('10 PUZZLES');
		expect(svg).toContain('LOCKED');
		expect(svg).toContain('Revealed after you finish');
		expect(svg).toContain('PLAY NOW AT PLAY.TARKANA.IO');
		expect(svg).toContain('viewBox="0 0 1200 630"');

		// Strictly no question answers or scores leaked
		expect(svg).not.toContain('Score:');
		expect(svg).not.toContain('Accuracy:');
	});

	it('renders quick duel mode correctly', () => {
		const svg = renderDuelCardSvg({
			...mockDuelOptions,
			sourceChallengeType: 'quick',
			totalQuestions: 5
		});

		expect(svg).toContain('QUICK LOGIC');
		expect(svg).toContain('5 PUZZLES');
	});

	it('escapes XML special characters in creator display name safely', () => {
		const svg = renderDuelCardSvg({
			...mockDuelOptions,
			creatorDisplayName: '<script>alert("hacked")</script> & Co'
		});

		expect(svg).not.toContain('<script>');
		expect(svg).toContain('&lt;script&gt;alert(&quot;hacked&quot;)&lt;/script&gt; &amp; Co');
	});

	it('renders real 1200x630 PNG buffer with PNG signature', () => {
		const pngBuffer = renderDuelCardPng(mockDuelOptions);

		expect(pngBuffer).toBeInstanceOf(Buffer);
		expect(pngBuffer.length).toBeGreaterThan(1000);

		// PNG signature: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
		const signature = Array.from(pngBuffer.slice(0, 8));
		expect(signature).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);

		// Read width and height from IHDR chunk (bytes 16-24)
		const width = pngBuffer.readUInt32BE(16);
		const height = pngBuffer.readUInt32BE(20);

		expect(width).toBe(1200);
		expect(height).toBe(630);
	});
});
