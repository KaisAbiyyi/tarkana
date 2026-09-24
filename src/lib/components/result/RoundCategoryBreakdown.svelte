<script lang="ts">
	import Button from '$lib/components/primitives/Button.svelte';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import { formatSeconds, labelQuestionType } from '$lib/shared/presentation/format';
	import { getI18nContext } from '$lib/i18n/context';
	import {
		calculateRoundCategoryBreakdown,
		type RoundCategorySummary
	} from '$lib/shared/scoring/category-breakdown';
	import type { QuestionType } from '$lib/shared/constants/challenge';
	import type { ResultQuestionReviewDto } from '$lib/server/challenge/types';

	type Props = {
		review: ResultQuestionReviewDto[];
		onPracticeClick?: (
			category: QuestionType,
			roundAccuracy: number,
			isSingleCategory: boolean
		) => void;
	};

	let { review, onPracticeClick }: Props = $props();
	const { locale, t } = getI18nContext();

	let summary: RoundCategorySummary = $derived(calculateRoundCategoryBreakdown(review));

	function handlePractice() {
		if (!summary.practiceCategory) return;
		const accuracy = summary.isSingleCategory
			? (summary.categories[0]?.accuracy ?? 0)
			: (summary.weakestCategory?.accuracy ?? 0);
		onPracticeClick?.(summary.practiceCategory, accuracy, summary.isSingleCategory);
	}
</script>

<div
	data-testid="round-category-breakdown"
	class="border-[3px] border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-hard)]"
>
	<!-- Header -->
	<div class="mb-6">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h2 class="text-2xl font-black text-[var(--color-ink)]">
				{t('result.categoryBreakdownTitle')}
			</h2>
			<Badge tone="accent">{t('result.thisRound')}</Badge>
		</div>
		<p class="mt-1 text-sm font-semibold text-[var(--color-muted)]">
			{t('result.categoryBreakdownSubtitle')}
		</p>
	</div>

	<!-- Highlight Cards -->
	{#if summary.isSingleCategory}
		{@const single = summary.categories[0]!}
		<div
			class="mb-6 border-[3px] border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-hard-sm)]"
		>
			<p class="text-xs font-black text-[var(--color-muted)] uppercase">
				{t('result.singleCategoryRound')}
			</p>
			<div class="mt-2 flex flex-wrap items-baseline justify-between gap-4">
				<h3 class="text-xl font-black text-[var(--color-ink)]">
					{labelQuestionType(single.questionType, locale)}
				</h3>
				<div class="flex items-center gap-4 text-sm font-bold">
					<span>
						{t('result.accuracyLabel')}: <strong class="text-black">{single.accuracy}%</strong>
						({single.correctAnswers}/{single.totalQuestions})
					</span>
					<span>•</span>
					<span>
						{t('result.avgTime')}:
						<strong class="text-black">{formatSeconds(single.averageTimeSeconds, locale)}</strong>
					</span>
				</div>
			</div>
		</div>
	{:else}
		<div class="mb-6 grid gap-4 sm:grid-cols-2">
			<!-- Strongest Category -->
			{#if summary.strongestCategory}
				<div
					class="border-[3px] border-emerald-600 bg-emerald-50/50 p-4 shadow-[var(--shadow-hard-sm)]"
				>
					<div class="flex items-center justify-between">
						<span class="text-xs font-black tracking-wider text-emerald-800 uppercase">
							⭐ {t('result.strongestCategory')}
						</span>
						<Badge tone="success">{summary.strongestCategory.accuracy}%</Badge>
					</div>
					<h3 class="mt-2 text-lg font-black text-emerald-950">
						{labelQuestionType(summary.strongestCategory.questionType, locale)}
					</h3>
					<p class="mt-1 text-xs font-bold text-emerald-800">
						{summary.strongestCategory.correctAnswers} / {summary.strongestCategory.totalQuestions}
						{t('result.questionsCount', { count: summary.strongestCategory.totalQuestions })} • {formatSeconds(
							summary.strongestCategory.averageTimeSeconds,
							locale
						)}
						{t('result.avgTime').toLowerCase()}
					</p>
				</div>
			{/if}

			<!-- Target for Practice -->
			{#if summary.weakestCategory}
				<div
					class="border-[3px] border-amber-600 bg-amber-50/50 p-4 shadow-[var(--shadow-hard-sm)]"
				>
					<div class="flex items-center justify-between">
						<span class="text-xs font-black tracking-wider text-amber-800 uppercase">
							🎯 {t('result.weakestCategory')}
						</span>
						<Badge tone="danger">{summary.weakestCategory.accuracy}%</Badge>
					</div>
					<h3 class="mt-2 text-lg font-black text-amber-950">
						{labelQuestionType(summary.weakestCategory.questionType, locale)}
					</h3>
					<p class="mt-1 text-xs font-bold text-amber-800">
						{summary.weakestCategory.correctAnswers} / {summary.weakestCategory.totalQuestions}
						{t('result.questionsCount', { count: summary.weakestCategory.totalQuestions })} • {formatSeconds(
							summary.weakestCategory.averageTimeSeconds,
							locale
						)}
						{t('result.avgTime').toLowerCase()}
					</p>
				</div>
			{:else}
				<div
					class="border-[3px] border-emerald-600 bg-emerald-50/50 p-4 shadow-[var(--shadow-hard-sm)]"
				>
					<span class="text-xs font-black tracking-wider text-emerald-800 uppercase">
						🎉 {t('result.perfectRound')}
					</span>
					<h3 class="mt-2 text-lg font-black text-emerald-950">
						{t('result.perfectRoundAccuracy')}
					</h3>
					<p class="mt-1 text-xs font-bold text-emerald-800">
						{t('result.perfectRoundDesc')}
					</p>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Category Details Grid -->
	<div class="overflow-x-auto">
		<table class="w-full border-collapse text-left text-sm font-semibold">
			<thead>
				<tr
					class="border-b-2 border-zinc-200 text-xs font-black text-[var(--color-muted)] uppercase"
				>
					<th class="py-2 pr-4">{t('result.categoryHeading')}</th>
					<th class="px-4 py-2 text-center">{t('result.accuracyLabel')}</th>
					<th class="px-4 py-2 text-center">{t('result.avgTime')}</th>
					<th class="py-2 pl-4 text-right">{t('result.pointsHeading')}</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-zinc-100">
				{#each summary.categories as cat (cat.questionType)}
					<tr class="transition-colors hover:bg-zinc-50">
						<td class="py-3 pr-4 font-black text-[var(--color-ink)]">
							{labelQuestionType(cat.questionType, locale)}
						</td>
						<td class="px-4 py-3 text-center">
							<span
								class="inline-block font-black {cat.accuracy >= 80
									? 'text-emerald-700'
									: cat.accuracy >= 50
										? 'text-amber-700'
										: 'text-rose-700'}"
							>
								{cat.accuracy}%
							</span>
							<span class="ml-1 text-xs text-[var(--color-muted)]">
								({cat.correctAnswers}/{cat.totalQuestions})
							</span>
						</td>
						<td class="px-4 py-3 text-center font-bold text-zinc-700">
							{formatSeconds(cat.averageTimeSeconds, locale)}
						</td>
						<td class="py-3 pl-4 text-right font-black text-black">
							+{cat.totalScoreEarned}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Practice Weakest CTA -->
	{#if summary.canPracticeWeakest && summary.practiceCategory}
		<div
			class="mt-6 flex flex-col items-start justify-between gap-4 border-[3px] border-[var(--color-border)] bg-[var(--color-paper)] p-4 shadow-[var(--shadow-hard-xs)] sm:flex-row sm:items-center"
		>
			<div>
				<p class="text-xs font-black text-[var(--color-muted)] uppercase">
					{t('result.recommendedPractice')}
				</p>
				<h4 class="text-base font-black text-[var(--color-ink)]">
					{t('result.drillCategory', {
						category: labelQuestionType(summary.practiceCategory, locale)
					})}
				</h4>
			</div>
			<Button
				variant="primary"
				href={`/challenge?session=quick&mode=${summary.practiceCategory}`}
				onclick={handlePractice}
			>
				{t('result.practiceWeakestCta', {
					category: labelQuestionType(summary.practiceCategory, locale)
				})}
			</Button>
		</div>
	{/if}
</div>
