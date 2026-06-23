import { expect, test } from '@playwright/test';

test('admin route redirects unauthenticated visitors to login', async ({ page }) => {
	await page.goto('/admin');

	await expect(page).toHaveURL(/\/auth\/login/);
	await expect(page.getByRole('heading', { name: /log in to tarkana/i })).toBeVisible();
});
