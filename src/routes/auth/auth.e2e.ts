import { expect, test } from '@playwright/test';

test('login page exposes email and Google sign-in options', async ({ page }) => {
	await page.goto('/auth/login');

	await expect(
		page.getByRole('heading', { name: /(log in to tarkana|masuk ke tarkana)/i })
	).toBeVisible();
	await expect(page.getByLabel(/(email|surel)/i)).toBeVisible();
	await expect(page.locator('input[name="password"]')).toBeVisible();
	await expect(page.getByRole('button', { name: /(log in|masuk)/i, exact: true })).toBeVisible();
	await expect(
		page.getByRole('button', {
			name: /(continue with google|lanjutkan dengan google)/i,
			exact: true
		})
	).toBeVisible();
});

test('register page exposes safe account creation form', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto('/auth/register');

	await expect(
		page.getByRole('heading', { name: /(create a tarkana account|buat akun tarkana)/i })
	).toBeVisible();
	await expect(page.getByLabel(/(display name|nama tampilan)/i)).toBeVisible();
	await expect(page.getByLabel(/(email|surel)/i)).toBeVisible();
	await expect(page.locator('input[name="password"]')).toBeVisible();
	await expect(
		page.getByRole('button', { name: /(create account|buat akun)/i, exact: true })
	).toBeVisible();
	await expect(
		page.getByRole('heading', { name: /(build your logic rating|logic rating)/i })
	).toBeVisible();
});
