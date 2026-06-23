import { expect, test } from '@playwright/test';

test('symbol challenge fixture renders visual tokens and playful feedback', async ({ page }) => {
	await page.goto('/demo/challenge');
	await page.waitForLoadState('networkidle');

	await expect(page.getByRole('heading', { name: 'Find the next symbol' })).toBeVisible();
	await expect(page.getByRole('img', { name: 'Triangle facing left' })).toHaveCount(2);
	await expect(page.getByText('triangle-left')).toHaveCount(0);

	const answer = page.getByRole('radio', { name: 'A. Triangle facing up' });
	await answer.click();
	await expect(answer).toHaveAttribute('aria-checked', 'true');

	await page.getByRole('button', { name: 'Check Answer' }).click();
	await expect(page.getByRole('status')).toContainText('Correct');
	await expect(page.getByText('+130 Reasoning Score')).toBeVisible();
});

test('symbol challenge remains usable on mobile with reduced motion', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/demo/challenge');
	await page.waitForLoadState('networkidle');

	const dimensions = await page.evaluate(() => ({
		clientWidth: document.documentElement.clientWidth,
		scrollWidth: document.documentElement.scrollWidth
	}));
	expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

	const choice = page.getByRole('radio', { name: 'A. Triangle facing up' });
	await choice.click();
	await expect(choice).toHaveAttribute('aria-checked', 'true');

	const motion = await choice.evaluate((element) => {
		const style = getComputedStyle(element);
		return {
			animationDuration: Number.parseFloat(style.animationDuration),
			transitionDuration: Number.parseFloat(style.transitionDuration)
		};
	});
	expect(motion.animationDuration).toBeLessThanOrEqual(0.001);
	expect(motion.transitionDuration).toBeLessThanOrEqual(0.001);
});
