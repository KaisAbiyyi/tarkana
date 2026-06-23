import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const viewports = [
	{ width: 320, height: 568 },
	{ width: 375, height: 667 },
	{ width: 390, height: 844 },
	{ width: 430, height: 932 },
	{ width: 768, height: 1024 },
	{ width: 820, height: 1180 },
	{ width: 1024, height: 768 },
	{ width: 1280, height: 720 },
	{ width: 1366, height: 768 },
	{ width: 1440, height: 900 },
	{ width: 1920, height: 1080 }
];

test('English, Indonesian, and Arabic render with the correct direction on desktop and mobile', async ({
	page
}) => {
	const locales = [
		{ value: 'en', dir: 'ltr', heading: 'Test how you think. Raise your level.' },
		{ value: 'id', dir: 'ltr', heading: 'Uji cara berpikirmu. Naikkan levelmu.' },
		{ value: 'ar', dir: 'rtl', heading: 'اختبر طريقة تفكيرك. ارفع مستواك.' }
	] as const;

	await mkdir('.codex-artifacts/i18n', { recursive: true });
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/');

	for (const locale of locales) {
		if ((await page.locator('html').getAttribute('lang')) !== locale.value) {
			await page.locator('select[name="locale"]:visible').selectOption(locale.value);
		}
		await expect(page.locator('html')).toHaveAttribute('lang', locale.value);
		await expect(page.locator('html')).toHaveAttribute('dir', locale.dir);
		await expect(page.getByRole('heading', { name: locale.heading })).toBeVisible();
		await page.screenshot({
			path: `.codex-artifacts/i18n/${locale.value}-desktop.png`,
			fullPage: true
		});

		await page.setViewportSize({ width: 390, height: 844 });
		await expect(page.locator('body')).toHaveCSS('direction', locale.dir);
		await page.screenshot({
			path: `.codex-artifacts/i18n/${locale.value}-mobile.png`,
			fullPage: true
		});
		await page.setViewportSize({ width: 1440, height: 900 });
	}
});

test('landing page presents Tarkana with safe product language', async ({ page }) => {
	await page.goto('/');

	await expect(
		page.getByRole('heading', { name: 'Test how you think. Raise your level.' })
	).toBeVisible();
	await expect(page.getByText('Complete 10 timed logic questions.')).toBeVisible();
	await expect(page.getByRole('link', { name: /Start a free challenge/i }).first()).toBeVisible();
	await expect(page.getByText(/not a clinical iq test/i).first()).toBeVisible();
	await expect(page.getByText(/diagnosis/i)).toBeVisible();
	await expect(page.locator('h1')).toHaveCount(1);
});

test('challenge preview separates prestart, running, result, and reset states', async ({
	page
}) => {
	await page.goto('/');
	const preview = page.locator('[data-demo-state]');
	const timer = page.getByRole('timer');

	await expect(preview).toHaveAttribute('data-demo-state', 'prestart');
	await expect(timer).toHaveAccessibleName('Time remaining 18s');
	await expect(page.getByText('The timer starts when you run the demo.')).toBeVisible();
	await page.waitForTimeout(1100);
	await expect(timer).toHaveAccessibleName('Time remaining 18s');

	await page.getByRole('button', { name: 'Start demo' }).click();
	await expect(preview).toHaveAttribute('data-demo-state', 'running');
	await expect(page.getByRole('button', { name: 'A. 48' })).toBeFocused();

	await page.getByRole('button', { name: 'B. 64' }).click();
	await expect(preview).toHaveAttribute('data-demo-state', 'correct');
	await expect(page.getByText(/Correct/)).toBeVisible();

	await page.getByRole('button', { name: 'Replay demo' }).click();
	await expect(preview).toHaveAttribute('data-demo-state', 'prestart');
	await expect(page.getByRole('button', { name: 'Start demo' })).toBeFocused();
	await expect(timer).toHaveAccessibleName('Time remaining 18s');
});

test('challenge preview exposes incorrect and timeout states', async ({ page }) => {
	test.setTimeout(40_000);
	await page.goto('/');
	const preview = page.locator('[data-demo-state]');

	await page.getByRole('button', { name: 'Start demo' }).click();
	await page.getByRole('button', { name: 'A. 48' }).click();
	await expect(preview).toHaveAttribute('data-demo-state', 'incorrect');
	await expect(page.getByText(/Wrong/)).toBeVisible();

	await page.getByRole('button', { name: 'Replay demo' }).click();
	await page.getByRole('button', { name: 'Start demo' }).click();
	await page.waitForTimeout(18_500);
	await expect(preview).toHaveAttribute('data-demo-state', 'timeout');
	await expect(page.getByText(/Time is up/)).toBeVisible();
	await expect(page.getByRole('timer')).toHaveAccessibleName('Time remaining 0s');
});

test('mobile menu manages focus and Escape', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await page.waitForLoadState('networkidle');

	const menuButton = page.getByRole('button', { name: 'Menu' });
	await menuButton.click();
	await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
	await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'How it works' }).first()).toBeFocused();

	await page.keyboard.press('Escape');
	await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toHaveCount(0);
	await expect(menuButton).toBeFocused();
});

test('reduced motion keeps content and demo functional', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/');

	await expect(page.getByRole('heading', { name: 'How Tarkana works' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Train four kinds of reasoning' })).toBeVisible();
	await page.getByRole('button', { name: 'Start demo' }).click();
	await expect(page.locator('[data-demo-state]')).toHaveAttribute('data-demo-state', 'running');
	await page.getByRole('button', { name: 'B. 64' }).click();
	await expect(page.getByText(/Correct/)).toBeVisible();
});

test('all required viewports avoid overflow and connector collisions', async ({ page }) => {
	test.setTimeout(90_000);

	for (const viewport of viewports) {
		await page.setViewportSize(viewport);
		await page.goto('/');
		await page.getByRole('heading', { name: 'How Tarkana works' }).scrollIntoViewIfNeeded();

		const geometry = await page.evaluate(() => {
			const intersects = (first: DOMRect, second: DOMRect): boolean =>
				first.left < second.right &&
				first.right > second.left &&
				first.top < second.bottom &&
				first.bottom > second.top;

			const connectors = [
				...document.querySelectorAll<HTMLElement>('.hiw-desktop-connector, .hiw-mobile-connector')
			]
				.filter((element) => {
					const style = getComputedStyle(element);
					return style.display !== 'none' && element.getBoundingClientRect().width > 0;
				})
				.map((element) => element.getBoundingClientRect());
			const textBlocks = [
				...document.querySelectorAll<HTMLElement>('.hiw-content h3, .hiw-content p')
			].map((element) => element.getBoundingClientRect());

			return {
				overflow: document.documentElement.scrollWidth - window.innerWidth,
				connectorCollision: connectors.some((connector) =>
					textBlocks.some((textBlock) => intersects(connector, textBlock))
				)
			};
		});

		expect(geometry.overflow, `${viewport.width}×${viewport.height} overflow`).toBeLessThanOrEqual(
			0
		);
		expect(geometry.connectorCollision, `${viewport.width}×${viewport.height} connector`).toBe(
			false
		);
	}
});
