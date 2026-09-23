import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as shareServiceModule from '$lib/server/share/share-service';
import { notFound } from '$lib/server/errors';

describe('/share/[publicId] page.server.ts load', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('returns shareResult and appOrigin for valid publicId', async () => {
		const fakeShareData: shareServiceModule.PublicShareResultDto = {
			publicId: 'shr_abc123',
			displayName: 'Solver',
			challengeType: 'standard',
			totalScore: 750,
			accuracy: 0.85,
			correctAnswers: 8,
			totalQuestions: 10,
			totalTimeSeconds: 50,
			averageTimeSeconds: 5.0,
			logicRank: 'Silver Solver',
			completedAt: new Date(),
			questions: [
				{ orderIndex: 0, isCorrect: true },
				{ orderIndex: 1, isCorrect: false }
			]
		};

		const mockGetPublicShare = vi.fn().mockResolvedValue(fakeShareData);
		vi.spyOn(shareServiceModule, 'createShareService').mockReturnValue({
			createShare: vi.fn(),
			getPublicShare: mockGetPublicShare,
			revokeShare: vi.fn()
		});

		const { load } = await import('./+page.server');
		const result = await load({
			params: { publicId: 'shr_abc123' },
			url: new URL('https://tarkana.app/share/shr_abc123'),
			locals: { locale: 'en' }
		} as any);

		expect(result).toBeDefined();
		expect(result?.shareResult).toEqual(fakeShareData);
		expect(mockGetPublicShare).toHaveBeenCalledWith('shr_abc123');
	});

	it('strips .png suffix from params.publicId', async () => {
		const mockGetPublicShare = vi.fn().mockResolvedValue({
			publicId: 'shr_xyz789'
		});
		vi.spyOn(shareServiceModule, 'createShareService').mockReturnValue({
			createShare: vi.fn(),
			getPublicShare: mockGetPublicShare,
			revokeShare: vi.fn()
		});

		const { load } = await import('./+page.server');
		await load({
			params: { publicId: 'shr_xyz789.png' },
			url: new URL('https://tarkana.app/share/shr_xyz789.png'),
			locals: { locale: 'en' }
		} as any);

		expect(mockGetPublicShare).toHaveBeenCalledWith('shr_xyz789');
	});

	it('throws 404 when shareResult is not found', async () => {
		vi.spyOn(shareServiceModule, 'createShareService').mockReturnValue({
			createShare: vi.fn(),
			getPublicShare: vi.fn().mockRejectedValue(notFound('Shared result was not found')),
			revokeShare: vi.fn()
		});

		const { load } = await import('./+page.server');
		await expect(
			load({
				params: { publicId: 'shr_missing' },
				url: new URL('https://tarkana.app/share/shr_missing'),
				locals: { locale: 'en' }
			} as any)
		).rejects.toMatchObject({
			status: 404
		});
	});
});
