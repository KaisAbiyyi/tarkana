<script lang="ts">
	import type { PageData } from './$types';
	import Button from '$lib/components/primitives/Button.svelte';
	import Card from '$lib/components/primitives/Card.svelte';
	import QuestionReviewList from '$lib/components/result/QuestionReviewList.svelte';
	import ResultSummary from '$lib/components/result/ResultSummary.svelte';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();
	let result = $derived(data.result);
</script>

<section class="grid gap-8">
	<header class="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
		<div>
			<p class="font-black text-[var(--color-muted)] uppercase">Completed session</p>
			<h1 class="text-4xl font-black sm:text-5xl">Result Review</h1>
		</div>
		<div class="flex flex-wrap gap-3">
			<Button href="/challenge">Retry</Button>
			<Button href="/leaderboard" variant="secondary">Leaderboard</Button>
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

	<Card title="Category Mastery">
		<p class="font-semibold text-[var(--color-muted)]">
			Strongest and weakest category summaries are derived from completed answers. Review details
			below to inspect each category-level result.
		</p>
	</Card>

	<section class="grid gap-4">
		<h2 class="text-3xl font-black">Question Review</h2>
		<QuestionReviewList review={result.review} />
	</section>
</section>
