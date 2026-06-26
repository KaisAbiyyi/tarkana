import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

const mockData = {
	locale: 'en',
	questionTypes: ['number_sequence', 'symbol_pattern', 'mini_deduction', 'memory_pattern'],
	profile: {
		id: '1',
		displayName: 'Test',

		role: 'user',
		rank: 'Bronze Mind',
		rating: 105
	},
	activeChallenge: null as any
} as const;

describe('challenge preparation page', () => {
	afterEach(() => vi.restoreAllMocks());

	it('starts with an incomplete three-step preparation state', async () => {
		render(Page, { data: mockData });

		await expect
			.element(page.getByRole('heading', { name: 'Complete round preparation' }))
			.toBeInTheDocument();
		await expect.element(page.getByText('0 of 3 steps ready', { exact: true })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Choose configuration' })).toBeDisabled();
	});

	it.each([
		['Quick Session', '5 questions', 'About 1 minutes'],
		['Standard Round', '10 questions', 'About 2 minutes'],
		['Long Session', '20 questions', 'About 4 minutes']
	])('keeps %s metadata synchronized', async (sessionName, count, duration) => {
		render(Page, { data: mockData });

		await page.getByRole('radio', { name: new RegExp(`^${sessionName}`) }).click();
		await expect.element(page.getByText(count, { exact: true }).last()).toBeInTheDocument();
		await expect.element(page.getByText(duration, { exact: true })).toBeInTheDocument();
	});

	it('releases the previous mode and updates readiness, loadout, and CTA', async () => {
		render(Page, { data: mockData });

		await page.getByRole('radio', { name: /^Long Session/ }).click();
		const numberMode = page.getByRole('radio', { name: /^Number Patterns/ });
		const memoryMode = page.getByRole('radio', { name: /^Pattern Memory/ });
		await numberMode.click();
		await memoryMode.click();

		await expect.element(numberMode).not.toBeChecked();
		await expect.element(memoryMode).toBeChecked();
		await expect
			.element(page.getByRole('heading', { name: 'Configuration ready' }))
			.toBeInTheDocument();
		await expect.element(page.getByText('2 of 3 steps ready', { exact: true })).toBeInTheDocument();
		await expect
			.element(page.getByRole('heading', { level: 2, name: 'Pattern Memory' }))
			.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Start Pattern Memory' })).toBeEnabled();
		await expect
			.element(page.getByText('20 questions · about 4 minutes').last())
			.toBeInTheDocument();
	});

	it('sends the authoritative configuration and preserves it after failure', async () => {
		const fetchMock = vi.spyOn(window, 'fetch').mockResolvedValue({
			json: async () => ({ ok: false, error: { code: 'unavailable', message: 'hidden' } })
		} as Response);
		render(Page, { data: mockData });

		await page.getByRole('radio', { name: /^Long Session/ }).click();
		await page.getByRole('radio', { name: /^Symbol Patterns/ }).click();
		await page.getByRole('button', { name: 'Start Symbol Patterns' }).click();

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
			challengeType: 'long',
			selectedMode: 'symbol_pattern'
		});
		await expect.element(page.getByRole('radio', { name: /^Long Session/ })).toBeChecked();
		await expect.element(page.getByRole('radio', { name: /^Symbol Patterns/ })).toBeChecked();
		await expect.element(page.getByRole('alert')).toHaveTextContent('Your choices remain saved');
		await expect.element(page.getByRole('button', { name: 'Start Symbol Patterns' })).toBeEnabled();
	});

	it('prevents duplicate challenge creation while loading', async () => {
		let resolveFetch: ((value: Response) => void) | undefined;
		const fetchMock = vi
			.spyOn(window, 'fetch')
			.mockImplementation(
				() => new Promise<Response>((resolveRequest) => (resolveFetch = resolveRequest))
			);
		render(Page, { data: mockData });

		await page.getByRole('radio', { name: /^Standard Round/ }).click();
		await page.getByRole('radio', { name: /^Mixed Mode/ }).click();
		await page.getByRole('button', { name: 'Start Mixed Mode' }).click();

		const loadingButton = page.getByRole('button', { name: 'Preparing round…' });
		await expect.element(loadingButton).toBeDisabled();
		await loadingButton.click({ force: true });
		expect(fetchMock).toHaveBeenCalledTimes(1);

		resolveFetch?.({
			json: async () => ({ ok: false, error: { code: 'unavailable', message: 'hidden' } })
		} as Response);
	});
});
