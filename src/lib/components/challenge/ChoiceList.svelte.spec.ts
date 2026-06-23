import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ChoiceList from './ChoiceList.svelte';

describe('ChoiceList', () => {
	it('renders symbol choices visually and preserves the answer token', async () => {
		const onSelect = vi.fn();
		render(ChoiceList, {
			choices: ['triangle-left', 'triangle-up'],
			selectedAnswer: '',
			questionType: 'symbol_pattern',
			onSelect
		});

		const choice = page.getByRole('radio', { name: /Triangle facing left/i });
		await expect.element(choice).toBeInTheDocument();
		await choice.click();

		expect(onSelect).toHaveBeenCalledWith('triangle-left');
	});
});
