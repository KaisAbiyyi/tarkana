import { expect, test } from '@playwright/test';

test('landing page presents Tarkana with safe product language', async ({ page }) => {
	await page.goto('/');

	await expect(page.getByRole('heading', { name: 'Tarkana' })).toBeVisible();
	await expect(page.getByText('Arena nalar untuk pikiran tajam.')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Mulai Challenge' })).toBeVisible();
	await expect(page.getByText(/bukan tes iq resmi/i)).toBeVisible();
	await expect(page.getByText(/diagnosis/i)).toHaveCount(0);
});
