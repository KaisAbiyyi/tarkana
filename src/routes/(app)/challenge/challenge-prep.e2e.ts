import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const sessions = [
	{ name: 'Quick Session', count: '5 questions', duration: 'About 1 minutes', id: 'quick' },
	{ name: 'Standard Round', count: '10 questions', duration: 'About 2 minutes', id: 'standard' },
	{ name: 'Long Session', count: '20 questions', duration: 'About 4 minutes', id: 'long' }
] as const;

const modes = [
	{ name: 'Mixed Mode', id: 'mixed' },
	{ name: 'Number Patterns', id: 'number_sequence' },
	{ name: 'Symbol Patterns', id: 'symbol_pattern' },
	{ name: 'Mini Deduction', id: 'mini_deduction' },
	{ name: 'Pattern Memory', id: 'memory_pattern' }
] as const;

test.beforeEach(async ({ page }) => {
	await page.goto('/demo/challenge-prep');
	await page.waitForLoadState('networkidle');
});

test('session and mode selections remain synchronized through rapid changes', async ({ page }) => {
	for (const session of sessions) {
		await page.getByRole('radio', { name: new RegExp(`^${session.name}`) }).click();
		await expect(page.getByText(session.count, { exact: true }).last()).toBeVisible();
		await expect(page.getByText(session.duration, { exact: true })).toBeVisible();
		await expect(page).toHaveURL(new RegExp(`session=${session.id}`));
	}

	for (const mode of modes) {
		await page.getByRole('radio', { name: new RegExp(`^${mode.name}`) }).click();
		await expect(page.getByRole('heading', { level: 2, name: mode.name })).toBeVisible();
		await expect(page.getByRole('button', { name: `Start ${mode.name}` })).toBeEnabled();
		await expect(page).toHaveURL(new RegExp(`mode=${mode.id}`));
	}

	await expect(page.getByRole('radio', { name: /^Pattern Memory/ })).toBeChecked();
	await expect(page.getByRole('radio', { name: /^Mini Deduction/ })).not.toBeChecked();
	await expect(page.locator('.selected-label:visible')).toHaveCount(2);
	await expect(page.getByText('2 of 3 steps ready', { exact: true })).toBeVisible();
});

test('native radio keyboard behavior, Enter activation, and focus remain visible', async ({
	page
}) => {
	const quick = page.getByRole('radio', { name: /^Quick Session/ });
	await quick.focus();
	await page.keyboard.press('ArrowRight');
	await expect(page.getByRole('radio', { name: /^Standard Round/ })).toBeChecked();

	const numberMode = page.getByRole('radio', { name: /^Number Patterns/ });
	await numberMode.focus();
	await page.keyboard.press('Enter');
	await expect(numberMode).toBeChecked();
	await expect(numberMode.locator('..')).toHaveCSS('outline-style', 'solid');
	await expect(numberMode.locator('..')).toHaveCSS('outline-width', '4px');
	await expect(page.getByRole('button', { name: 'Start Number Patterns' })).toBeEnabled();
});

test('loading blocks duplicate creation and a failure preserves the loadout', async ({ page }) => {
	let requestCount = 0;
	let requestBody: unknown;
	await page.route('**/api/challenge/start', async (route) => {
		requestCount += 1;
		requestBody = route.request().postDataJSON();
		await new Promise((resolveDelay) => setTimeout(resolveDelay, 350));
		await route.fulfill({
			status: 400,
			contentType: 'application/json',
			body: JSON.stringify({ ok: false, error: { code: 'unavailable', message: 'hidden' } })
		});
	});

	await page.getByRole('radio', { name: /^Long Session/ }).click();
	await page.getByRole('radio', { name: /^Symbol Patterns/ }).click();
	await page.getByRole('button', { name: 'Start Symbol Patterns' }).click();

	const loadingButton = page.getByRole('button', { name: 'Preparing round…' });
	await expect(loadingButton).toBeDisabled();
	await expect(page.getByRole('radio', { name: /^Long Session/ })).toBeDisabled();
	await expect(page.getByRole('radio', { name: /^Symbol Patterns/ })).toBeDisabled();
	await expect(page.getByText('3 of 3 steps ready', { exact: true })).toBeVisible();
	await loadingButton.click({ force: true });
	await expect(page.getByRole('alert')).toContainText('Your choices remain saved');

	expect(requestCount).toBe(1);
	expect(requestBody).toEqual({ challengeType: 'long', selectedMode: 'symbol_pattern' });
	await expect(page.getByRole('radio', { name: /^Long Session/ })).toBeChecked();
	await expect(page.getByRole('radio', { name: /^Symbol Patterns/ })).toBeChecked();
	await expect(page.getByRole('button', { name: 'Start Symbol Patterns' })).toBeEnabled();
});

test('successful creation enters the configured arena without exposing an answer', async ({
	page
}) => {
	await page.route('**/api/challenge/start', async (route) => {
		await route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({
				ok: true,
				data: {
					sessionId: 'session-visual-qa',
					totalQuestions: 5,
					currentQuestion: {
						sessionQuestionId: 'question-visual-qa',
						categoryId: 'category-number',
						questionType: 'number_sequence',
						prompt: 'Continue the pattern: 2, 4, 6, …',
						choices: ['7', '8', '9', '10'],
						difficultyScore: 100,
						timeLimitSeconds: 30,
						metadata: {},
						generatedSeed: 'browser-safe-seed',
						orderIndex: 0
					}
				}
			})
		});
	});

	await page.getByRole('radio', { name: /^Quick Session/ }).click();
	await page.getByRole('radio', { name: /^Number Patterns/ }).click();
	await page.getByRole('button', { name: 'Start Number Patterns' }).click();

	await expect(page.getByRole('heading', { level: 1, name: 'Number Patterns' })).toBeVisible();
	await expect(page.getByText('Continue the pattern: 2, 4, 6, …')).toBeVisible();
	await expect(page.getByRole('radio', { name: '8' })).toBeVisible();
	await expect(page.locator('body')).not.toContainText('correctAnswer');
});

test('reduced motion keeps complete states visible without stale inline transforms', async ({
	page
}) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.reload();
	await page.waitForLoadState('networkidle');
	const standardSession = page.getByRole('radio', { name: /^Standard Round/ });
	await standardSession.click();
	await expect(standardSession).toBeChecked();
	await page.getByRole('radio', { name: /^Number Patterns/ }).click();
	await page.getByRole('radio', { name: /^Pattern Memory/ }).click();

	const selectedCard = page.getByRole('radio', { name: /^Pattern Memory/ }).locator('..');
	await expect(selectedCard).toHaveAttribute('data-selected', 'true');
	await expect(selectedCard).not.toHaveAttribute('style');
	await expect(page.getByRole('button', { name: 'Start Pattern Memory' })).toBeVisible();
});

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
] as const;

for (const viewport of viewports) {
	test(`visual QA at ${viewport.width}x${viewport.height}`, async ({ page }) => {
		await page.setViewportSize(viewport);
		await page.reload();
		await page.waitForLoadState('networkidle');
		const longSession = page.getByRole('radio', { name: /^Long Session/ });
		await longSession.click();
		await expect(longSession).toBeChecked();
		await page.getByRole('radio', { name: /^Mixed Mode/ }).click();
		await expect(page.getByRole('button', { name: 'Start Mixed Mode' })).toBeVisible();
		await expect(page.locator('h1')).toHaveCount(1);

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(overflow).toBe(0);

		const selectedCards = page.locator('[data-selected="true"]');
		await expect(selectedCards).toHaveCount(2);
		for (const card of await selectedCards.all()) {
			const bounds = await card.boundingBox();
			expect(bounds).not.toBeNull();
			expect(bounds!.x).toBeGreaterThanOrEqual(0);
			expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
		}

		if (viewport.width < 768) {
			const modeSection = await page.locator('#mode-heading').boundingBox();
			const loadout = await page.locator('section[aria-labelledby="loadout-title"]').boundingBox();
			expect(modeSection).not.toBeNull();
			expect(loadout).not.toBeNull();
			expect(loadout!.y).toBeGreaterThan(modeSection!.y);
		}

		await page.evaluate(() => window.scrollTo(0, 0));
		await mkdir('.codex-artifacts/challenge-prep', { recursive: true });
		await page.screenshot({
			path: `.codex-artifacts/challenge-prep/${viewport.width}x${viewport.height}.png`,
			fullPage: true
		});
	});
}
