import { expect, test } from '@playwright/test';

const protectedRoutes = ['/dashboard', '/history', '/profile'];

for (const route of protectedRoutes) {
	test(`${route} redirects unauthenticated visitors to login`, async ({ page }) => {
		await page.goto(route);

		await expect(page).toHaveURL(/\/auth\/login/);
		await expect(
			page.getByRole('heading', { name: /(masuk ke tarkana|log in to tarkana)/i })
		).toBeVisible();
	});
}

test('/challenge allows unauthenticated access in guest mode', async ({ page }) => {
	await page.goto('/challenge');

	await expect(page).toHaveURL(/\/challenge/);
	await expect(page.getByText(/(mode tamu|guest mode)/i).first()).toBeVisible();
});

test('/leaderboard allows unauthenticated access', async ({ page }) => {
	await page.goto('/leaderboard');

	await expect(page).toHaveURL(/\/leaderboard/);
});
