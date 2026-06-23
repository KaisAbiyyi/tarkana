<script lang="ts">
	import type { QuestionType } from '$lib/shared/constants/challenge';
	import SymbolGlyph from '$lib/components/challenge/SymbolGlyph.svelte';
	import { labelSymbolToken, parseSymbolPrompt } from '$lib/shared/presentation/symbols';
	import { getI18nContext } from '$lib/i18n/context';

	type ActiveQuestion = {
		questionType: QuestionType;
		prompt: string;
		orderIndex: number;
	};

	type Props = {
		question: ActiveQuestion;
	};

	let { question }: Props = $props();
	const { locale, t } = getI18nContext();
	let symbolPrompt = $derived(
		question.questionType === 'symbol_pattern' ? parseSymbolPrompt(question.prompt, locale) : null
	);

	let localizedTextPrompt = $derived.by(() => {
		if (question.questionType === 'symbol_pattern') return question.prompt;
		const match = /^Find the next number:\s*(.+)$/i.exec(question.prompt.trim());
		if (match) {
			return t('question.nextNumber', { sequence: match[1] });
		}
		if (import.meta.env?.DEV)
			console.warn(`[I18N] Missing translation for text prompt: ${question.prompt}`);
		return question.prompt;
	});
</script>

<section
	class="question-enter border-[3px] border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-hard)] sm:p-6"
>
	<div class="mb-4 flex items-center justify-end">
		<span class="text-sm font-black text-[var(--color-muted)]"
			>{t('arena.questionNumber', { number: question.orderIndex + 1 })}</span
		>
	</div>

	{#if symbolPrompt}
		<h2 class="text-2xl leading-tight font-black sm:text-3xl">{symbolPrompt.instruction}</h2>
		<div
			class="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3"
			aria-label={symbolPrompt.tokens.map((token) => labelSymbolToken(token, locale)).join(', ')}
		>
			{#each symbolPrompt.tokens as token, index (`${token}-${index}`)}
				<div
					class={`symbol-sequence-tile flex h-20 min-w-16 items-center justify-center border-[3px] border-[var(--color-border)] p-2 shadow-[var(--shadow-hard-sm)] sm:h-24 sm:min-w-20 ${
						token === '?' ? 'bg-[var(--color-info)] text-4xl font-black' : 'bg-[var(--color-paper)]'
					}`}
					style={`--sequence-index: ${index}`}
				>
					{#if token === '?'}
						<span aria-label={t('arena.unknownSymbol')}>?</span>
					{:else}
						<SymbolGlyph {token} size="lg" />
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<h2 class="text-2xl leading-tight font-black sm:text-3xl">{localizedTextPrompt}</h2>
	{/if}
</section>
