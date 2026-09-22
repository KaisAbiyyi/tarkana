import { expect, test } from '@playwright/test';
import * as devalue from 'devalue';

test.describe('P1.1 Guest Activation & Claim Flow', () => {
	test('landing page hero CTA routes immediately to guest challenge mode', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Click hero primary CTA
		const heroCta = page
			.locator('.hero-actions')
			.getByRole('link', { name: /(start|mulai)/i })
			.first();
		await expect(heroCta).toBeVisible();
		await heroCta.click();

		// Should directly land on /challenge with guest mode active
		await expect(page).toHaveURL(/\/challenge/);
		await expect(page.getByText(/(guest mode|mode tamu)/i).first()).toBeVisible();
	});

	test('unauthenticated user completes guest challenge and sees conversion claim banner', async ({
		page
	}) => {
		const testSessionId = 'guest-e2e-session-12345';
		const testQuestionId = 'guest-e2e-question-12345';

		const mockFinishData = {
			sessionId: testSessionId,
			totalScore: 150,
			accuracy: 100,
			correctAnswers: 1,
			wrongAnswers: 0,
			totalTimeSeconds: 5,
			averageTimeSeconds: 5,
			ratingBefore: 0,
			ratingAfter: 40,
			ratingDelta: 40,
			rankBefore: 'Unranked' as const,
			rankAfter: 'Bronze Mind' as const,
			rankPromoted: true,
			rankProgress: {
				nextRank: 'Silver Solver' as const,
				progressPercent: 30,
				pointsToNextRank: 100
			},
			isSuspicious: false,
			suspiciousReasons: [],
			review: [],
			isGuest: true,
			canClaim: true
		};

		await page.route('**/api/challenge/start', async (route) => {
			await route.fulfill({
				contentType: 'application/json',
				body: JSON.stringify({
					ok: true,
					data: {
						sessionId: testSessionId,
						totalQuestions: 1,
						currentQuestion: {
							sessionQuestionId: testQuestionId,
							categoryId: 'category-number',
							questionType: 'number_sequence',
							prompt: 'Find the next number: 5, 10, 15, …',
							choices: ['18', '20', '25', '30'],
							timeLimitSeconds: 30,
							metadata: {},
							generatedSeed: 'seed',
							orderIndex: 0
						},
						isGuest: true
					}
				})
			});
		});

		await page.route('**/api/challenge/submit', async (route) => {
			await route.fulfill({
				contentType: 'application/json',
				body: JSON.stringify({
					ok: true,
					data: {
						isCorrect: true,
						scoreEarned: 150,
						isComplete: true,
						nextQuestion: null
					}
				})
			});
		});

		await page.route('**/api/challenge/finish', async (route) => {
			await route.fulfill({
				contentType: 'application/json',
				body: JSON.stringify({
					ok: true,
					data: mockFinishData
				})
			});
		});

		await page.route('**/result/*/__data.json*', async (route) => {
			const url = new URL(route.request().url());
			const invalidated = url.searchParams.get('x-sveltekit-invalidated');
			const nodes = [
				invalidated && invalidated[0] === '0'
					? { type: 'skip' }
					: { type: 'data', data: JSON.parse(devalue.stringify({ locale: 'en' })), uses: {} },
				invalidated && invalidated[1] === '0'
					? { type: 'skip' }
					: { type: 'data', data: JSON.parse(devalue.stringify({ profile: null })), uses: {} },
				{
					type: 'data',
					data: JSON.parse(devalue.stringify({ result: mockFinishData })),
					uses: {}
				}
			];
			await route.fulfill({
				contentType: 'application/json',
				body: JSON.stringify({ type: 'data', nodes })
			});
		});

		await page.goto('/challenge?session=quick&mode=number_sequence');
		await page.waitForLoadState('networkidle');

		const startButton = page.getByRole('button', { name: 'Start Number Patterns' });
		await expect(startButton).toBeEnabled();
		await startButton.click();

		// Live arena appears
		await expect(page.getByText('Find the next number: 5, 10, 15, …')).toBeVisible();

		// Submit choice '20'
		await page.getByRole('radio', { name: /20/ }).click();
		const submitButton = page.getByRole('button', { name: /(submit answer|kirim jawaban)/i });
		await expect(submitButton).toBeEnabled();
		await submitButton.click();

		// Finish and redirect to result
		await expect(page).toHaveURL(new RegExp(`/result/${testSessionId}`));

		// Claim banner is visible for guest
		const banner = page.getByTestId('guest-claim-banner');
		await expect(banner).toBeVisible();
		await expect(banner.getByText(/(save my progress|simpan progres saya)/i)).toBeVisible();
		const registerLink = banner.getByRole('link', { name: /(register|daftar)/i });
		await expect(registerLink).toBeVisible();
		await expect(registerLink).toHaveAttribute(
			'href',
			new RegExp(`/auth/register\\?claimSession=${testSessionId}`)
		);
	});
});
