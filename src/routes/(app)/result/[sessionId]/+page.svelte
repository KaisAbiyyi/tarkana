<script lang="ts">
	import type { PageData } from './$types';
	import Button from '$lib/components/primitives/Button.svelte';
	import Card from '$lib/components/primitives/Card.svelte';
	import QuestionReviewList from '$lib/components/result/QuestionReviewList.svelte';
	import ResultSummary from '$lib/components/result/ResultSummary.svelte';
	import { getI18nContext } from '$lib/i18n/context';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();
	const { t } = getI18nContext();
	let result = $derived(data.result);
</script>

<svelte:head>
	<title>{t('result.title')}</title>
	<meta name="description" content={t('result.meta')} />
</svelte:head>

<section class="grid gap-8">
	<header class="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
		<div>
			<p class="page-kicker">{t('result.completed')}</p>
			<h1 class="page-title">{t('result.review')}</h1>
		</div>
		<div class="flex flex-wrap gap-3">
			<Button href="/challenge">{t('result.retry')}</Button>
			<Button href="/leaderboard" variant="secondary">{t('nav.leaderboard')}</Button>
		</div>
	</header>

	<ResultSummary
		totalScore={result.totalScore}
		accuracy={result.accuracy}
		correctAnswers={result.correctAnswers}
		wrongAnswers={result.wrongAnswers}
		averageTimeSeconds={result.averageTimeSeconds}
		ratingDelta={result.ratingDelta}
		rankBefore={result.rankBefore}
		rankAfter={result.rankAfter}
		rankPromoted={result.rankPromoted}
		rankProgress={result.rankProgress}
		isSuspicious={result.isSuspicious}
	/>

	<Card title={t('dashboard.categoryMastery')}>
		<p class="font-semibold text-[var(--color-muted)]">
			{t('result.categoryBody')}
		</p>
	</Card>

	<section class="grid gap-4">
		<h2 class="text-3xl font-black">{t('result.questionReview')}</h2>
		<QuestionReviewList review={result.review} />
	</section>
</section>
