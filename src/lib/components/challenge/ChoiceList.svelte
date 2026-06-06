<script lang="ts">
	import type { QuestionType } from '$lib/shared/constants/challenge';
	import SymbolGlyph from '$lib/components/challenge/SymbolGlyph.svelte';
	import { isVisualSymbolToken, labelSymbolToken } from '$lib/shared/presentation/symbols';

	type Props = {
		choices: string[];
		selectedAnswer: string;
		questionType?: QuestionType;
		disabled?: boolean;
		onSelect: (choice: string) => void;
	};

	let { choices, selectedAnswer, questionType, disabled = false, onSelect }: Props = $props();
</script>

<div
	class={`grid gap-3 ${questionType === 'symbol_pattern' ? 'sm:grid-cols-2' : ''}`}
	role="radiogroup"
	aria-label="Answer choices"
>
	{#each choices as choice, index (choice)}
		{@const selected = selectedAnswer === choice}
		{@const visualSymbol = questionType === 'symbol_pattern' && isVisualSymbolToken(choice)}
		<button
			type="button"
			class={`choice-card relative min-h-16 border-[3px] border-[var(--color-border)] p-3 text-left font-black shadow-[var(--shadow-hard-sm)] disabled:cursor-not-allowed disabled:opacity-60 sm:p-4 ${
				selected ? 'choice-card-selected bg-[var(--color-accent)]' : 'bg-white'
			}`}
			{disabled}
			role="radio"
			aria-checked={selected}
			aria-label={visualSymbol
				? `${String.fromCharCode(65 + index)}. ${labelSymbolToken(choice)}`
				: undefined}
			onclick={() => onSelect(choice)}
		>
			<span class={`flex items-center gap-4 ${visualSymbol ? 'justify-center pr-8' : ''}`}>
				<span
					class="inline-flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[var(--color-border)] bg-[var(--color-primary)]"
				>
					{String.fromCharCode(65 + index)}
				</span>
				{#if visualSymbol}
					<SymbolGlyph token={choice} size="md" />
					<span class="sr-only">{labelSymbolToken(choice)}</span>
				{:else}
					<span>{choice}</span>
				{/if}
			</span>
			{#if selected}
				<span
					class="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--color-border)] bg-white"
					aria-hidden="true"
				>
					✓
				</span>
			{/if}
		</button>
	{/each}
</div>
