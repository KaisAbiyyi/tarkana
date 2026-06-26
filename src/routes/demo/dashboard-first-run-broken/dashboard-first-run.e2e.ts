import { expect, test } from '@playwright/test';

const modes = [
	{ radio: 'Pola Angka', label: 'Mulai Pola Angka', query: 'number_sequence' },
	{ radio: 'Pola Simbol', label: 'Mulai Pola Simbol', query: 'symbol_pattern' },
	{ radio: 'Deduksi Singkat', label: 'Mulai Deduksi Singkat', query: 'mini_deduction' },
	{ radio: 'Memori Pola', label: 'Mulai Memori Pola', query: 'memory_pattern' }
] as const;

test.beforeEach(async ({ page }) => {
	await page.goto('/demo/dashboard-first-run');
	await page.waitForLoadState('networkidle');
});

test('first-run CTA has stable visible styles without overlays or animation state', async ({
	page
}) => {
	const cta = page.getByRole('link', { name: 'Mulai Pola Angka' });
	await expect(cta).toBeVisible();
	await expect(cta).toHaveAttribute('href', '/challenge?mode=number_sequence');
	const statusBadge = page.getByText('Belum diperingkat', { exact: true });
	await expect(statusBadge).toBeVisible();
	expect(await statusBadge.evaluate((element) => element.tagName)).toBe('SPAN');
	await expect(statusBadge).not.toHaveAttribute('role');
	await expect(statusBadge).not.toHaveAttribute('tabindex');

	await expect
		.poll(() =>
			cta.evaluate((element) => {
				const style = getComputedStyle(element);
				const before = getComputedStyle(element, '::before');
				const after = getComputedStyle(element, '::after');

				return {
					backgroundColor: style.backgroundColor,
					color: style.color,
					opacity: style.opacity,
					visibility: style.visibility,
					clipPath: style.clipPath,
					mixBlendMode: style.mixBlendMode,
					textIndent: style.textIndent,
					inlineStyle: element.getAttribute('style'),
					beforeContent: before.content,
					afterContent: after.content
				};
			})
		)
		.toEqual({
			backgroundColor: 'rgb(23, 18, 13)',
			color: 'rgb(255, 207, 36)',
			opacity: '1',
			visibility: 'visible',
			clipPath: 'none',
			mixBlendMode: 'normal',
			textIndent: '0px',
			inlineStyle: null,
			beforeContent: 'none',
			afterContent: 'none'
		});
});

test('CTA label and route follow every selected mode', async ({ page }) => {
	for (const mode of modes) {
		const radio = page.getByRole('radio', { name: new RegExp(`^${mode.radio}`) });
		await radio.click();
		await expect(radio).toHaveAttribute('aria-checked', 'true');
		await expect(page.getByText(`Mode terpilih: ${mode.radio}`, { exact: true })).toBeVisible();
		await expect(page.getByRole('link', { name: mode.label })).toHaveAttribute(
			'href',
			`/challenge?mode=${mode.query}`
		);
	}
});

test('CTA label stays visible on hover, active, and focus-visible', async ({ page }) => {
	const cta = page.getByRole('link', { name: 'Mulai Pola Angka' });
	await cta.evaluate((element) =>
		element.addEventListener('click', (event) => event.preventDefault())
	);

	await cta.hover();
	await expect(cta).toHaveCSS('color', 'rgb(255, 207, 36)');
	await expect(cta).toHaveCSS('visibility', 'visible');
	await expect
		.poll(() => cta.evaluate((element) => getComputedStyle(element).translate))
		.not.toBe('none');

	const bounds = await cta.boundingBox();
	expect(bounds).not.toBeNull();
	await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
	await page.mouse.down();
	await expect(cta).toHaveCSS('color', 'rgb(255, 207, 36)');
	await expect(cta).toHaveCSS('visibility', 'visible');
	await expect(cta).toHaveCSS('box-shadow', 'none');
	await expect
		.poll(() => cta.evaluate((element) => getComputedStyle(element).translate))
		.toBe('4px 4px');
	await page.mouse.up();

	await page.reload();
	await page.waitForLoadState('networkidle');
	await page.keyboard.press('Tab');
	await expect(page.getByRole('radio', { name: /^Pola Angka/ })).toBeFocused();
	await page.keyboard.press('Tab');
	await expect(cta).toBeFocused();
	await expect(cta).toHaveCSS('outline-style', 'solid');
	await expect(cta).toHaveCSS('outline-width', '4px');
	await expect(cta).toHaveCSS('color', 'rgb(255, 207, 36)');
});

for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1366, 1440, 1920]) {
	test(`CTA remains inside viewport at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
		await page.reload();

		const cta = page.getByRole('link', { name: 'Mulai Pola Angka' });
		await expect(cta).toBeVisible();
		const bounds = await cta.boundingBox();
		expect(bounds).not.toBeNull();
		expect(bounds!.x).toBeGreaterThanOrEqual(0);
		expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
		expect(bounds!.height).toBeGreaterThanOrEqual(44);

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(overflow).toBe(0);
	});
}
