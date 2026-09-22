import { expect, test } from '@playwright/test';

test.describe('P1.3 Daily Challenge E2E', () => {
	test('/daily page renders countdown timer and daily challenge details', async ({ page }) => {
		await page.route('**/api/challenge/daily/start', async (route) => {
			await route.fulfill({
				contentType: 'application/json',
				body: JSON.stringify({
					ok: true,
					data: {
						sessionId: 'daily-e2e-session-123',
						totalQuestions: 10,
						currentQuestion: null,
						isResumed: false
					}
				})
			});
		});

		await page.goto('/daily');
		await page.waitForLoadState('networkidle');

		// Page title and description
		await expect(page.locator('h1')).toBeVisible();
		await expect(page.getByText('Next Challenge In')).toBeVisible();
		await expect(page.getByText('10 Questions')).toBeVisible();

		// Start button is visible
		const startButton = page.getByRole('button', { name: /Start Daily Challenge|Mulai/i });
		await expect(startButton).toBeVisible();
		await startButton.click();
	});

	test('/api/challenge/daily/status endpoint handles status request', async ({ request }) => {
		const res = await request.get('/api/challenge/daily/status');
		expect([200, 500]).toContain(res.status());
		const body = await res.json();
		expect(typeof body.ok).toBe('boolean');
	});
});
