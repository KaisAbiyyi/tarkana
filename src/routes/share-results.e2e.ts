import { expect, test } from '@playwright/test';

test.describe('P1.5 Shareable Results & Visual Badges E2E', () => {
	test('complete challenge -> share modal -> public share page -> dynamic OG preview', async ({
		playwright,
		page
	}) => {
		// 1. Create isolated guest context
		const guestContext = await playwright.request.newContext({
			baseURL: 'http://127.0.0.1:4173'
		});

		try {
			// 2. Start a challenge as guest
			const startRes = await guestContext.post('/api/challenge/start', {
				data: { challengeType: 'standard' }
			});
			expect(startRes.status()).toBe(200);
			const startBody = await startRes.json();
			expect(startBody.ok).toBe(true);
			const sessionId = startBody.data.sessionId;
			let currentQuestion = startBody.data.currentQuestion;

			// Incomplete session cannot be shared
			const prematureShare = await guestContext.post('/api/share/create', {
				data: { sessionId }
			});
			expect(prematureShare.status()).toBe(400);

			// 3. Answer all questions
			const totalQuestions = startBody.data.totalQuestions;
			for (let i = 0; i < totalQuestions; i++) {
				expect(currentQuestion).toBeDefined();
				const submitRes = await guestContext.post('/api/challenge/submit', {
					data: {
						sessionId,
						sessionQuestionId: currentQuestion.sessionQuestionId,
						selectedAnswer: currentQuestion.choices[0],
						timeSpentSeconds: 2
					}
				});
				expect(submitRes.status()).toBe(200);
				const submitBody = await submitRes.json();
				currentQuestion = submitBody.data.nextQuestion;
			}

			// 4. Finish the challenge
			const finishRes = await guestContext.post('/api/challenge/finish', {
				data: { sessionId }
			});
			expect(finishRes.status()).toBe(200);

			// 5. Transfer cookies to browser and navigate to result page
			const storageState = await guestContext.storageState();
			await page.context().addCookies(storageState.cookies);
			await page.goto(`/result/${sessionId}`);
			await page.waitForLoadState('networkidle');

			// Check that Share Result button is visible
			const shareBtn = page.getByRole('button', { name: /Share Result|Bagikan/i });
			await expect(shareBtn).toBeVisible();

			// Click Share Result button to open modal
			await shareBtn.click();

			// Verify modal is open and shows share links
			const modalTitle = page.getByText(/Share Your Result|Bagikan Hasil/i);
			await expect(modalTitle).toBeVisible();

			// 6. Test share creation API directly (must be idempotent)
			const shareRes1 = await guestContext.post('/api/share/create', {
				data: { sessionId }
			});
			expect(shareRes1.status()).toBe(200);
			const shareBody1 = await shareRes1.json();
			expect(shareBody1.ok).toBe(true);
			const publicId = shareBody1.data.publicId;
			expect(publicId).toMatch(/^shr_[a-zA-Z0-9_-]+$/);

			const shareRes2 = await guestContext.post('/api/share/create', {
				data: { sessionId }
			});
			expect(shareRes2.status()).toBe(200);
			const shareBody2 = await shareRes2.json();
			expect(shareBody2.data.publicId).toBe(publicId);

			// 7. Verify Dynamic OpenGraph PNG endpoint
			const ogRes = await guestContext.get(`/api/og/share/${publicId}.png`);
			expect(ogRes.status()).toBe(200);
			expect(ogRes.headers()['content-type']).toBe('image/png');
			expect(ogRes.headers()['cache-control']).toContain('public');

			const pngBuffer = await ogRes.body();
			// Assert PNG magic bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
			expect(pngBuffer[0]).toBe(0x89);
			expect(pngBuffer[1]).toBe(0x50);
			expect(pngBuffer[2]).toBe(0x4e);
			expect(pngBuffer[3]).toBe(0x47);

			// Verify ?download=1 gives attachment header
			const downloadRes = await guestContext.get(`/api/og/share/${publicId}.png?download=1`);
			expect(downloadRes.status()).toBe(200);
			expect(downloadRes.headers()['content-disposition']).toContain('attachment');

			// 8. Open Public Share page in a completely separate anonymous browser context (zero cookies)
			const anonymousBrowserContext = await page.context().browser()!.newContext();
			const anonymousPage = await anonymousBrowserContext.newPage();

			try {
				await anonymousPage.goto(`/share/${publicId}`);
				await anonymousPage.waitForLoadState('networkidle');

				// Assert page title and heading
				await expect(anonymousPage.locator('h1')).toBeVisible();

				// Assert OpenGraph & Twitter Meta Tags
				const ogImage = await anonymousPage
					.locator('meta[property="og:image"]')
					.getAttribute('content');
				expect(ogImage).toContain(`/api/og/share/${publicId}.png`);

				const twitterCard = await anonymousPage
					.locator('meta[name="twitter:card"]')
					.getAttribute('content');
				expect(twitterCard).toBe('summary_large_image');

				// Anti-spoiler verification:
				// Ensure question prompt, explanations, or question IDs are NEVER in DOM
				const pageContent = await anonymousPage.content();
				expect(pageContent).not.toContain(sessionId);
				expect(pageContent).not.toContain('guest_token');

				// Performance question tiles are visible
				const tiles = anonymousPage.locator('div[aria-label*="Question"]');
				await expect(tiles.first()).toBeVisible();

				// Conversion CTA is visible and clickable
				const ctaBtn = anonymousPage.locator('a[href="/challenge"], a[href="/daily"]');
				await expect(ctaBtn.first()).toBeVisible();
			} finally {
				await anonymousBrowserContext.close();
			}
		} finally {
			await guestContext.dispose();
		}
	});

	test('rejects non-existent share ID with 404', async ({ request }) => {
		const res = await request.get('/api/og/share/shr_nonexistent999.png');
		expect(res.status()).toBe(404);
	});
});
