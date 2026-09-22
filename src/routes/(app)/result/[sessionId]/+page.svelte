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

	{#if result.canClaim}
		<div
			data-testid="guest-claim-banner"
			class="border-[3px] border-[var(--color-border)] bg-[var(--color-primary)] p-6 shadow-[var(--shadow-hard)]"
		>
			<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<span
						class="mb-2 inline-block border-2 border-[var(--color-border)] bg-black px-2 py-0.5 text-xs font-black text-white uppercase"
					>
						{t('challenge.guestMode')}
					</span>
					<h2 class="text-xl font-black text-black">{t('result.saveProgress')}</h2>
					<p class="mt-1 max-w-xl text-sm font-bold text-black/80">
						{t('result.guestClaimPrompt')}
					</p>
				</div>
				<div class="flex shrink-0 flex-wrap gap-2">
					<Button href={`/auth/register?claimSession=${result.sessionId}`}>
						{t('nav.register')}
					</Button>
					<Button href={`/auth/login?claimSession=${result.sessionId}`} variant="secondary">
						{t('nav.login')}
					</Button>
				</div>
			</div>
		</div>
	{/if}

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
