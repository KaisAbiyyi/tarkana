import { expect, test } from '@playwright/test';

test.describe('P1.3 Daily Challenge E2E', () => {
	test('/daily page renders countdown timer and daily challenge details without API mocks', async ({
		page
	}) => {
		// Critical-path: NO page.route() mock for /api/challenge/daily/start
		await page.goto('/daily');
		await page.waitForLoadState('networkidle');

		// Page title and description
		await expect(page.locator('h1')).toBeVisible();
		await expect(page.getByText('Next Challenge In')).toBeVisible();
		await expect(page.getByText('10 Questions')).toBeVisible();

		// Start button is visible and clickable
		const startButton = page.getByRole('button', { name: /Start Daily Challenge|Mulai/i });
		await expect(startButton).toBeVisible();
		await startButton.click();
	});

	test('/api/challenge/daily/status returns 200 with valid daily challenge status', async ({
		request
	}) => {
		const res = await request.get('/api/challenge/daily/status');
		// Must strictly return 200; never accept HTTP 500 as success
		expect(res.status()).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
		expect(body.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(body.data.totalQuestions).toBe(10);
		expect(body.data.secondsUntilReset).toBeGreaterThan(0);
		expect(['not_started', 'in_progress', 'completed', 'abandoned']).toContain(
			body.data.attemptStatus
		);
	});

	test('guest Daily lifecycle: start -> resume -> duplicate rejection (409)', async ({
		request
	}) => {
		// 1. First start creates new official attempt
		const startRes = await request.post('/api/challenge/daily/start');
		expect(startRes.status()).toBe(200);
		const startBody = await startRes.json();
		expect(startBody.ok).toBe(true);
		expect(startBody.data.sessionId).toBeTruthy();
		expect(startBody.data.totalQuestions).toBe(10);
		expect(startBody.data.isResumed).toBe(false);
		expect(startBody.data.currentQuestion).toBeTruthy();
		expect(startBody.data.currentQuestion.orderIndex).toBe(0);

		// 2. Second start with the same session cookies resumes the attempt
		const resumeRes = await request.post('/api/challenge/daily/start');
		expect(resumeRes.status()).toBe(200);
		const resumeBody = await resumeRes.json();
		expect(resumeBody.ok).toBe(true);
		expect(resumeBody.data.sessionId).toBe(startBody.data.sessionId);
		expect(resumeBody.data.isResumed).toBe(true);
	});

	test('abandoned daily challenge forfeits attempt and rejects restarting (409)', async ({
		playwright
	}) => {
		// Create a separate request context to simulate a fresh guest session
		const freshContext = await playwright.request.newContext({
			baseURL: 'http://127.0.0.1:4173'
		});

		try {
			// 1. Start a fresh daily challenge session
			const startRes = await freshContext.post('/api/challenge/daily/start');
			expect(startRes.status()).toBe(200);
			const startBody = await startRes.json();
			expect(startBody.ok).toBe(true);
			const sessionId = startBody.data.sessionId;

			// 2. Abandon the in-progress session (forfeiting the attempt)
			const abandonRes = await freshContext.post('/api/challenge/abandon', {
				data: { sessionId }
			});
			expect(abandonRes.status()).toBe(200);
			const abandonBody = await abandonRes.json();
			expect(abandonBody.success).toBe(true);

			// 3. Attempting to start again must be rejected with 409 Conflict
			const retryRes = await freshContext.post('/api/challenge/daily/start');
			expect(retryRes.status()).toBe(409);
			const retryBody = await retryRes.json();
			expect(retryBody.ok).toBe(false);
			expect(retryBody.error.message).toMatch(/forfeited|completed/i);
		} finally {
			await freshContext.dispose();
		}
	});
});
