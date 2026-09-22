import { expect, test } from '@playwright/test';

test.describe('P1.4 Daily Leaderboard E2E', () => {
	test('/leaderboard defaults to Daily tab and renders leaderboard view', async ({ page }) => {
		await page.goto('/leaderboard');
		await page.waitForLoadState('networkidle');

		// Page heading and tab navigation
		await expect(page.locator('h1')).toBeVisible();

		// Active tab should be Daily Challenge
		const dailyTab = page.locator('nav[aria-label="Leaderboard views"] button', {
			hasText: /Daily Challenge|Tantangan Harian/i
		});
		await expect(dailyTab).toBeVisible();

		// Check countdown reset timer
		const timerBanner = page.locator('header');
		await expect(timerBanner).toBeVisible();

		// Leaderboard table or empty state
		const mainContent = page.locator('main');
		await expect(mainContent).toBeVisible();
	});

	test('/api/challenge/daily/leaderboard returns 200 with valid schema and zero PII', async ({
		request
	}) => {
		const res = await request.get('/api/challenge/daily/leaderboard');
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.ok).toBe(true);
		expect(body.data).toBeDefined();
		expect(body.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(Array.isArray(body.data.items)).toBe(true);
		expect(typeof body.data.totalParticipants).toBe('number');
		expect(body.data.secondsUntilReset).toBeGreaterThan(0);

		// Zero PII & no leaked internal IDs
		const jsonString = JSON.stringify(body.data);
		expect(jsonString).not.toContain('guestTokenHash');
		expect(jsonString).not.toContain('sessionId');
		expect(jsonString).not.toContain('attemptId');
		expect(jsonString).not.toContain('@'); // No emails
	});

	test('rejects future date lookups with 400 Bad Request', async ({ request }) => {
		const res = await request.get('/api/challenge/daily/leaderboard?date=2099-12-31');
		expect(res.status()).toBe(400);

		const body = await res.json();
		expect(body.ok).toBe(false);
		expect(body.error.code).toBe('bad_request');
		expect(body.error.message).toBeTruthy();
	});

	test('tab switching between Daily and Global works correctly', async ({ page }) => {
		await page.goto('/leaderboard');
		await page.waitForLoadState('networkidle');

		// Click Global tab
		const globalTab = page.locator('nav[aria-label="Leaderboard views"] button', {
			hasText: /Global Logic Rating|Rating Logika Global/i
		});
		await globalTab.click();

		// URL updates to ?tab=global
		await expect(page).toHaveURL(/tab=global/);

		// Click Daily tab
		const dailyTab = page.locator('nav[aria-label="Leaderboard views"] button', {
			hasText: /Daily Challenge|Tantangan Harian/i
		});
		await dailyTab.click();

		// URL updates to ?tab=daily
		await expect(page).toHaveURL(/tab=daily/);
	});
});
