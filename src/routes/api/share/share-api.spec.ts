import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST } from './create/+server';
import { GET } from '../og/share/[publicId]/+server';
import * as shareServiceModule from '$lib/server/share/share-service';
import * as renderCardModule from '$lib/server/share/render-card';

vi.mock('$lib/server/security/rate-limit', () => ({
	enforceRateLimit: vi.fn().mockResolvedValue(undefined)
}));

describe('Share API Endpoints', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe('POST /api/share/create', () => {
		it('returns 400 for invalid or missing sessionId', async () => {
			const mockEvent: any = {
				getClientAddress: () => '127.0.0.1',
				locals: {
					getUser: async () => null,
					locale: 'en'
				},
				request: {
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => ({ sessionId: 'not-a-uuid' })
				}
			};

			const response = await POST(mockEvent);
			expect(response.status).toBe(400);

			const body = await response.json();
			expect(body.ok).toBe(false);
			expect(body.error.code).toBe('bad_request');
		});

		it('creates share link and returns 200 with publicId and shareUrl', async () => {
			const validUuid = '11111111-1111-4111-8111-111111111111';
			const mockCreateShare = vi.fn().mockResolvedValue({
				publicId: 'shr_test123',
				shareUrl: 'http://localhost:5173/share/shr_test123'
			});

			vi.spyOn(shareServiceModule, 'createShareService').mockReturnValue({
				createShare: mockCreateShare,
				getPublicShare: vi.fn(),
				revokeShare: vi.fn()
			});

			const mockEvent: any = {
				getClientAddress: () => '127.0.0.1',
				locals: {
					getUser: async () => ({ id: 'usr-1' }),
					locale: 'en'
				},
				request: {
					headers: new Headers({ 'content-type': 'application/json' }),
					json: async () => ({ sessionId: validUuid })
				}
			};

			const response = await POST(mockEvent);
			expect(response.status).toBe(200);

			const body = await response.json();
			expect(body.ok).toBe(true);
			expect(body.data).toEqual({
				publicId: 'shr_test123',
				shareUrl: 'http://localhost:5173/share/shr_test123'
			});
			expect(mockCreateShare).toHaveBeenCalledWith(mockEvent, { sessionId: validUuid });
		});
	});

	describe('GET /api/og/share/[publicId]', () => {
		it('renders PNG and returns 200 with image/png and cache headers', async () => {
			const fakeShareData: shareServiceModule.PublicShareResultDto = {
				publicId: 'shr_test123',
				displayName: 'Jane Doe',
				challengeType: 'daily',
				challengeDate: '2026-09-23',
				totalScore: 920,
				accuracy: 0.9,
				correctAnswers: 9,
				totalQuestions: 10,
				totalTimeSeconds: 65,
				averageTimeSeconds: 6.5,
				logicRank: 'Master Thinker',
				completedAt: new Date(),
				questions: [
					{ orderIndex: 0, isCorrect: true },
					{ orderIndex: 1, isCorrect: true }
				]
			};

			const mockPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

			vi.spyOn(shareServiceModule, 'createShareService').mockReturnValue({
				createShare: vi.fn(),
				getPublicShare: vi.fn().mockResolvedValue(fakeShareData),
				revokeShare: vi.fn()
			});

			vi.spyOn(renderCardModule, 'renderShareCardPng').mockReturnValue(mockPngBuffer);

			const mockEvent: any = {
				getClientAddress: () => '127.0.0.1',
				params: { publicId: 'shr_test123.png' },
				url: new URL('http://localhost:5173/api/og/share/shr_test123.png'),
				locals: { locale: 'en' }
			};

			const response = await GET(mockEvent);
			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Type')).toBe('image/png');
			expect(response.headers.get('Cache-Control')).toContain('public');
			expect(response.headers.get('Content-Disposition')).toBeNull();

			const arrayBuffer = await response.arrayBuffer();
			expect(Buffer.from(arrayBuffer)).toEqual(mockPngBuffer);
		});

		it('adds Content-Disposition attachment header when ?download=1 is provided', async () => {
			const fakeShareData: shareServiceModule.PublicShareResultDto = {
				publicId: 'shr_download123',
				displayName: 'Solver',
				challengeType: 'standard',
				totalScore: 800,
				accuracy: 0.8,
				correctAnswers: 8,
				totalQuestions: 10,
				totalTimeSeconds: 90,
				averageTimeSeconds: 9.0,
				logicRank: 'Silver Solver',
				completedAt: new Date(),
				questions: []
			};

			const mockPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

			vi.spyOn(shareServiceModule, 'createShareService').mockReturnValue({
				createShare: vi.fn(),
				getPublicShare: vi.fn().mockResolvedValue(fakeShareData),
				revokeShare: vi.fn()
			});

			vi.spyOn(renderCardModule, 'renderShareCardPng').mockReturnValue(mockPngBuffer);

			const mockEvent: any = {
				getClientAddress: () => '127.0.0.1',
				params: { publicId: 'shr_download123' },
				url: new URL('http://localhost:5173/api/og/share/shr_download123?download=1'),
				locals: { locale: 'en' }
			};

			const response = await GET(mockEvent);
			expect(response.status).toBe(200);
			expect(response.headers.get('Content-Disposition')).toBe(
				'attachment; filename="tarkana-shr_download123.png"'
			);
		});
	});
});
