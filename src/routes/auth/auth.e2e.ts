import { expect, test } from '@playwright/test';

test('login page exposes email and Google sign-in options', async ({ page }) => {
	await page.goto('/auth/login');

	await expect(page.getByRole('heading', { name: /masuk ke tarkana/i })).toBeVisible();
	await expect(page.getByLabel('Email')).toBeVisible();
	await expect(page.getByLabel('Password')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Masuk', exact: true })).toBeVisible();
	await expect(
		page.getByRole('button', { name: 'Masuk dengan Google', exact: true })
	).toBeVisible();
});

test('register page exposes safe account creation form', async ({ page }) => {
	await page.goto('/auth/register');

	await expect(page.getByRole('heading', { name: /buat akun tarkana/i })).toBeVisible();
	await expect(page.getByLabel('Display name')).toBeVisible();
	await expect(page.getByLabel('Email')).toBeVisible();
	await expect(page.getByLabel('Password')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Daftar', exact: true })).toBeVisible();
	await expect(page.getByText(/logic rating/i)).toBeVisible();
});
