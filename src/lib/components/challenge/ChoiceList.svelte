<script lang="ts">
	type Props = {
		choices: string[];
		selectedAnswer: string;
		disabled?: boolean;
		onSelect: (choice: string) => void;
	};

	let { choices, selectedAnswer, disabled = false, onSelect }: Props = $props();
</script>

<div class="grid gap-3" role="radiogroup" aria-label="Answer choices">
	{#each choices as choice, index (choice)}
		<button
			type="button"
			class={`min-h-14 border-[3px] border-[var(--color-border)] p-4 text-left font-black shadow-[var(--shadow-hard-sm)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
				selectedAnswer === choice ? 'bg-[var(--color-accent)]' : 'bg-white'
			}`}
			{disabled}
			role="radio"
			aria-checked={selectedAnswer === choice}
			onclick={() => onSelect(choice)}
		>
			<span
				class="mr-3 inline-flex h-8 w-8 items-center justify-center border-2 border-[var(--color-border)] bg-[var(--color-primary)]"
			>
				{String.fromCharCode(65 + index)}
			</span>
			{choice}
		</button>
	{/each}
</div>
