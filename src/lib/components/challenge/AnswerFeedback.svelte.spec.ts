import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AnswerFeedback from './AnswerFeedback.svelte';

describe('AnswerFeedback', () => {
	it('announces correct feedback and earned score without revealing an answer', async () => {
		render(AnswerFeedback, { status: 'correct', scoreEarned: 90 });

		await expect.element(page.getByRole('status')).toHaveTextContent('Correct');
		await expect.element(page.getByText('+90 Reasoning Score')).toBeInTheDocument();
		await expect.element(page.getByText(/correct answer is/i)).not.toBeInTheDocument();
	});

	it('shows an encouraging retry message for an incorrect answer', async () => {
		render(AnswerFeedback, { status: 'incorrect', scoreEarned: 0 });

		await expect.element(page.getByRole('status')).toHaveTextContent('Keep going');
	});
});
