import { expect, test } from '@playwright/test';

test('login page exposes email and Google sign-in options', async ({ page }) => {
	await page.goto('/auth/login');

	await expect(page.getByRole('heading', { name: /log in to tarkana/i })).toBeVisible();
	await expect(page.getByLabel('Email')).toBeVisible();
	await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible();
	await expect(
		page.getByRole('button', { name: 'Continue with Google', exact: true })
	).toBeVisible();
});

test('register page exposes safe account creation form', async ({ page }) => {
	await page.goto('/auth/register');

	await expect(page.getByRole('heading', { name: /create your tarkana account/i })).toBeVisible();
	await expect(page.getByLabel('Display name')).toBeVisible();
	await expect(page.getByLabel('Email')).toBeVisible();
	await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: /build your Logic Rating/i })).toBeVisible();
});
