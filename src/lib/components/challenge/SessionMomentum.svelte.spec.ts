import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SessionMomentum from './SessionMomentum.svelte';

describe('SessionMomentum', () => {
	it('shows progress, streak, and server-returned score total', async () => {
		render(SessionMomentum, {
			currentQuestion: 3,
			totalQuestions: 5,
			streak: 2,
			sessionScore: 180
		});

		await expect.element(page.getByText('3 of 5')).toBeInTheDocument();
		await expect.element(page.getByText('2 streak')).toBeInTheDocument();
		await expect.element(page.getByText('180 pts')).toBeInTheDocument();
		await expect.element(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
	});
});
