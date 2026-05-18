import { expect, test } from '@playwright/test';

const protectedRoutes = ['/dashboard', '/challenge', '/history', '/leaderboard', '/profile'];

for (const route of protectedRoutes) {
	test(`${route} redirects unauthenticated visitors to login`, async ({ page }) => {
		await page.goto(route);

		await expect(page).toHaveURL(/\/auth\/login/);
		await expect(page.getByRole('heading', { name: /masuk ke tarkana/i })).toBeVisible();
	});
}
