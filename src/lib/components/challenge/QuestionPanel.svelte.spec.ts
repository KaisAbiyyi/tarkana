import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import QuestionPanel from './QuestionPanel.svelte';

describe('QuestionPanel', () => {
	it('renders symbol prompts as visual sequence tiles', async () => {
		render(QuestionPanel, {
			question: {
				questionType: 'symbol_pattern',
				prompt:
					'Find the next symbol: triangle-left | triangle-up | triangle-right | triangle-down | ?',
				difficultyScore: 40,
				orderIndex: 0
			},
			totalQuestions: 5
		});

		await expect
			.element(page.getByRole('heading', { name: 'Find the next symbol' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('img', { name: 'Triangle pointing left' }))
			.toBeInTheDocument();
		await expect.element(page.getByText('triangle-left')).not.toBeInTheDocument();
		await expect.element(page.getByText('?')).toBeInTheDocument();
	});
});
