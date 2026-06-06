<script lang="ts">
	import type { QuestionType } from '$lib/shared/constants/challenge';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import SymbolGlyph from '$lib/components/challenge/SymbolGlyph.svelte';
	import { labelQuestionType } from '$lib/shared/presentation/format';
	import { labelSymbolToken, parseSymbolPrompt } from '$lib/shared/presentation/symbols';

	type ActiveQuestion = {
		questionType: QuestionType;
		prompt: string;
		difficultyScore: number;
		orderIndex: number;
	};

	type Props = {
		question: ActiveQuestion;
		totalQuestions: number;
	};

	let { question, totalQuestions }: Props = $props();
	let symbolPrompt = $derived(
		question.questionType === 'symbol_pattern' ? parseSymbolPrompt(question.prompt) : null
	);
</script>

<section
	class="question-enter border-[3px] border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-hard)] sm:p-6"
>
	<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
		<div class="flex flex-wrap gap-2">
			<Badge tone="accent">{labelQuestionType(question.questionType)}</Badge>
			<Badge tone="warning">Difficulty {question.difficultyScore}</Badge>
		</div>
		<p class="font-black">
			Question {question.orderIndex + 1}/{totalQuestions}
		</p>
	</div>

	{#if symbolPrompt}
		<h1 class="text-2xl leading-tight font-black sm:text-3xl">{symbolPrompt.instruction}</h1>
		<div
			class="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3"
			aria-label={symbolPrompt.tokens.map(labelSymbolToken).join(', ')}
		>
			{#each symbolPrompt.tokens as token, index (`${token}-${index}`)}
				<div
					class={`symbol-sequence-tile flex h-20 min-w-16 items-center justify-center border-[3px] border-[var(--color-border)] p-2 shadow-[var(--shadow-hard-sm)] sm:h-24 sm:min-w-20 ${
						token === '?' ? 'bg-[var(--color-info)] text-4xl font-black' : 'bg-[var(--color-paper)]'
					}`}
					style={`--sequence-index: ${index}`}
				>
					{#if token === '?'}
						<span aria-label="Unknown symbol">?</span>
					{:else}
						<SymbolGlyph {token} size="lg" />
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<h1 class="text-2xl leading-tight font-black sm:text-3xl">{question.prompt}</h1>
	{/if}
</section>
