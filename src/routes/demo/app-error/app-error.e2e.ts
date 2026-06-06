import { expect, test } from '@playwright/test';

test('app error state is branded and actionable', async ({ page }) => {
	await page.goto('/demo/app-error');

	await expect(page.getByRole('heading', { name: 'Result is not ready' })).toBeVisible();
	await expect(
		page.getByText('Challenge cannot be finished before every question is answered')
	).toBeVisible();
	await expect(page.getByRole('link', { name: 'Continue challenge' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Open history' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Back to dashboard' })).toBeVisible();
});

test('app error state has no horizontal overflow on mobile', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/demo/app-error');

	const dimensions = await page.evaluate(() => ({
		clientWidth: document.documentElement.clientWidth,
		scrollWidth: document.documentElement.scrollWidth
	}));

	expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
	await expect(page.getByRole('heading', { name: 'Result is not ready' })).toBeVisible();
});
