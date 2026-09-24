<script lang="ts">
	import Badge from '$lib/components/primitives/Badge.svelte';
	import SymbolGlyph from '$lib/components/challenge/SymbolGlyph.svelte';
	import { formatSeconds, labelQuestionType } from '$lib/shared/presentation/format';
	import { isVisualSymbolToken, labelSymbolToken } from '$lib/shared/presentation/symbols';
	import { getI18nContext } from '$lib/i18n/context';
	import type { ResultQuestionReviewDto } from '$lib/server/challenge/types';

	export type ReviewFilter = 'all' | 'missed' | 'correct';

	type Props = {
		review: ResultQuestionReviewDto[];
		onFilterChange?: (filter: ReviewFilter) => void;
	};

	let { review, onFilterChange }: Props = $props();
	const { locale, t } = getI18nContext();

	let activeFilter = $state<ReviewFilter>('all');

	let missedCount = $derived(review.filter((item) => !item.isCorrect).length);
	let correctCount = $derived(review.filter((item) => item.isCorrect).length);

	let filteredReview = $derived(
		review.filter((item) => {
			if (activeFilter === 'missed') return !item.isCorrect;
			if (activeFilter === 'correct') return item.isCorrect;
			return true;
		})
	);

	function setFilter(newFilter: ReviewFilter) {
		activeFilter = newFilter;
		onFilterChange?.(newFilter);
	}

	function translateChoice(choice: string, questionType: string): string {
		const lowered = choice.toLowerCase().trim();
		if (lowered === 'cannot be determined') return t('arena.cannotDetermine');
		if (lowered === 'all of the above') return t('arena.allAbove');
		if (lowered === 'none of the above') return t('arena.noneAbove');
		if (questionType === 'memory_pattern') {
			return choice
				.split(' > ')
				.map((token) => labelSymbolToken(token, locale))
				.join(' > ');
		}
		return choice;
	}
</script>

<div class="grid gap-6">
	<!-- Filter Bar -->
	<div
		class="flex flex-wrap items-center gap-2 border-[3px] border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-[var(--shadow-hard-sm)]"
		role="tablist"
		aria-label="Filter questions"
	>
		<button
			type="button"
			role="tab"
			aria-selected={activeFilter === 'all'}
			class="px-4 py-2 text-sm font-black transition-transform {activeFilter === 'all'
				? 'border-2 border-[var(--color-border)] bg-[var(--color-primary)] text-black shadow-[2px_2px_0_var(--color-border)]'
				: 'text-[var(--color-muted)] hover:text-black'}"
			onclick={() => setFilter('all')}
		>
			{t('result.filterAll', { total: review.length })}
		</button>
		<button
			type="button"
			role="tab"
			aria-selected={activeFilter === 'missed'}
			class="px-4 py-2 text-sm font-black transition-transform {activeFilter === 'missed'
				? 'border-2 border-[var(--color-border)] bg-[var(--color-danger)] text-white shadow-[2px_2px_0_var(--color-border)]'
				: 'text-[var(--color-muted)] hover:text-black'}"
			onclick={() => setFilter('missed')}
		>
			{t('result.filterMissed', { count: missedCount })}
		</button>
		<button
			type="button"
			role="tab"
			aria-selected={activeFilter === 'correct'}
			class="px-4 py-2 text-sm font-black transition-transform {activeFilter === 'correct'
				? 'border-2 border-[var(--color-border)] bg-[var(--color-success)] text-white shadow-[2px_2px_0_var(--color-border)]'
				: 'text-[var(--color-muted)] hover:text-black'}"
			onclick={() => setFilter('correct')}
		>
			{t('result.filterCorrect', { count: correctCount })}
		</button>
	</div>

	<!-- Empty Filter State -->
	{#if filteredReview.length === 0}
		<div
			class="border-[3px] border-[var(--color-border)] bg-white p-8 text-center shadow-[var(--shadow-hard)]"
		>
			{#if activeFilter === 'missed'}
				<div class="mb-3 text-4xl">🎉</div>
				<h3 class="text-xl font-black">{t('result.noMissedQuestions')}</h3>
			{:else}
				<h3 class="text-xl font-black">{t('result.noCorrectQuestions')}</h3>
			{/if}
		</div>
	{/if}

	<!-- Question Cards -->
	{#each filteredReview as item (item.sessionQuestionId)}
		{@const isTimedOut =
			item.selectedAnswer === null ||
			(item.timeSpentSeconds >= item.timeLimitSeconds && !item.isCorrect)}
		<article
			data-testid={`review-question-${item.orderIndex}`}
			class="border-[3px] border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-hard-sm)] transition-shadow hover:shadow-[var(--shadow-hard)] md:p-6"
		>
			<!-- Card Header & Badges -->
			<div
				class="mb-4 flex flex-wrap items-center justify-between gap-3 border-b-2 border-zinc-100 pb-3"
			>
				<div class="flex flex-wrap items-center gap-2">
					<Badge tone={item.isCorrect ? 'success' : 'danger'}>
						{item.isCorrect ? t('result.correct') : t('result.wrong')}
					</Badge>
					{#if isTimedOut}
						<Badge tone="danger">
							⏱️ {t('result.timedOut')}
						</Badge>
					{/if}
					<Badge tone="accent">{labelQuestionType(item.questionType, locale)}</Badge>
				</div>
				<p class="text-sm font-black text-[var(--color-ink)]">
					{t('arena.questionNumber', { number: item.orderIndex + 1 })}
				</p>
			</div>

			<!-- Prompt -->
			<h2 class="text-lg leading-snug font-black text-[var(--color-ink)] md:text-xl">
				{item.prompt}
			</h2>

			<!-- Difficulty & Score Row -->
			<div
				class="mt-3 flex flex-wrap items-center gap-4 text-xs font-bold text-[var(--color-muted)] md:text-sm"
			>
				<span>{t('result.difficulty', { score: item.difficultyScore })}</span>
				<span>•</span>
				<span class="font-black text-black"
					>{t('result.scoreEarned', { score: item.scoreEarned })}</span
				>
				<span>•</span>
				<span>{formatSeconds(item.timeSpentSeconds, locale)} / {item.timeLimitSeconds}s</span>
			</div>

			<!-- Dynamic Choices List -->
			<div class="mt-5 grid gap-3 sm:grid-cols-2">
				{#each item.choices as choice, choiceIdx (choice)}
					{@const isSelected = item.selectedAnswer === choice}
					{@const isCorrectChoice = item.correctAnswer === choice}
					{@const visualSymbol =
						(item.questionType === 'symbol_pattern' || item.questionType === 'memory_pattern') &&
						isVisualSymbolToken(choice)}
					{@const letter = String.fromCharCode(65 + choiceIdx)}

					<div
						class="relative flex flex-col justify-between border-[3px] p-3 text-left transition-colors {isSelected &&
						isCorrectChoice
							? 'border-emerald-600 bg-emerald-50 font-black text-emerald-950'
							: isSelected && !isCorrectChoice
								? 'border-rose-600 bg-rose-50 font-black text-rose-950'
								: isCorrectChoice
									? 'border-emerald-600 bg-emerald-50/60 font-bold text-emerald-900'
									: 'border-zinc-200 bg-zinc-50/50 text-zinc-700'}"
					>
						<div class="flex items-center gap-2">
							<span
								class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border-2 border-current text-xs font-black"
							>
								{#if isCorrectChoice}
									✓
								{:else if isSelected && !isCorrectChoice}
									✕
								{:else}
									{letter}
								{/if}
							</span>

							{#if visualSymbol}
								<div class="py-1">
									<SymbolGlyph token={choice} size="sm" />
								</div>
								<span class="sr-only">{labelSymbolToken(choice, locale)}</span>
							{:else}
								<span class="text-sm leading-snug md:text-base">
									{translateChoice(choice, item.questionType)}
								</span>
							{/if}
						</div>

						<!-- Choice Label Badge -->
						{#if isSelected && isCorrectChoice}
							<span
								class="mt-2 inline-block self-start rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-black tracking-wider text-white uppercase"
							>
								{t('result.yourChoiceCorrect')}
							</span>
						{:else if isSelected && !isCorrectChoice}
							<span
								class="mt-2 inline-block self-start rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-black tracking-wider text-white uppercase"
							>
								{t('result.yourChoiceWrong')}
							</span>
						{:else if isCorrectChoice}
							<span
								class="mt-2 inline-block self-start rounded bg-emerald-600/80 px-1.5 py-0.5 text-[10px] font-black tracking-wider text-white uppercase"
							>
								{t('result.correctChoice')}
							</span>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Enhanced Explanation Callout -->
			<div
				class="mt-5 border-l-[5px] border-[var(--color-primary)] bg-[var(--color-paper)] p-4 shadow-[var(--shadow-hard-xs)]"
			>
				<p class="text-xs font-black tracking-wider text-[var(--color-muted)] uppercase">
					{t('result.explanationHeading')}
				</p>
				<p class="mt-1 text-sm leading-relaxed font-bold text-[var(--color-ink)] md:text-base">
					{item.explanation}
				</p>
			</div>
		</article>
	{/each}
</div>
