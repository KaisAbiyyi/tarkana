import { describe, expect, it } from 'vitest';
import { renderShareCardPng, renderShareCardSvg } from './render-card';
import type { PublicShareResultDto } from './share-service';

describe('renderShareCard', () => {
	const mockShare: PublicShareResultDto = {
		publicId: 'shr_test123456',
		displayName: 'LogicMaster',
		challengeType: 'daily',
		challengeDate: '2026-09-23',
		totalScore: 920,
		accuracy: 0.9,
		correctAnswers: 9,
		totalQuestions: 10,
		totalTimeSeconds: 45,
		averageTimeSeconds: 4.5,
		logicRank: 'Gold Analyst',
		completedAt: new Date('2026-09-23T10:00:00Z'),
		questions: [
			{ orderIndex: 0, isCorrect: true },
			{ orderIndex: 1, isCorrect: true },
			{ orderIndex: 2, isCorrect: false },
			{ orderIndex: 3, isCorrect: true },
			{ orderIndex: 4, isCorrect: true },
			{ orderIndex: 5, isCorrect: true },
			{ orderIndex: 6, isCorrect: true },
			{ orderIndex: 7, isCorrect: true },
			{ orderIndex: 8, isCorrect: true },
			{ orderIndex: 9, isCorrect: true }
		]
	};

	it('renders valid SVG with expected labels and tiles', () => {
		const svg = renderShareCardSvg(mockShare);

		expect(svg).toContain('TARKANA');
		expect(svg).toContain('DAILY CHALLENGE • 2026-09-23');
		expect(svg).toContain('LogicMaster');
		expect(svg).toContain('920');
		expect(svg).toContain('90%');
		expect(svg).toContain('Gold Analyst');
		expect(svg).toContain('viewBox="0 0 1200 630"');
	});

	it('renders a real 1200x630 PNG buffer with PNG magic bytes', () => {
		const pngBuffer = renderShareCardPng(mockShare);

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
