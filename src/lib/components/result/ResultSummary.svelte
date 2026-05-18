<script lang="ts">
	import Badge from '$lib/components/primitives/Badge.svelte';
	import Card from '$lib/components/primitives/Card.svelte';
	import ProgressBar from '$lib/components/primitives/ProgressBar.svelte';
	import {
		formatPercent,
		formatSeconds,
		formatSignedNumber
	} from '$lib/shared/presentation/format';

	type RankProgress = {
		nextRank: string | null;
		progressPercent: number;
		pointsToNextRank: number | null;
	};

	type Props = {
		totalScore: number;
		accuracy: number;
		correctAnswers: number;
		wrongAnswers: number;
		averageTimeSeconds: number;
		ratingDelta: number;
		rankBefore: string;
		rankAfter: string;
		rankPromoted: boolean;
		rankProgress: RankProgress;
		isSuspicious: boolean;
	};

	let {
		totalScore,
		accuracy,
		correctAnswers,
		wrongAnswers,
		averageTimeSeconds,
		ratingDelta,
		rankBefore,
		rankAfter,
		rankPromoted,
		rankProgress,
		isSuspicious
	}: Props = $props();
</script>

<Card tone={rankPromoted ? 'warning' : 'default'} title="Session Result">
	<div class="grid gap-4 lg:grid-cols-[1fr_1fr]">
		<div>
			<p class="text-sm font-black uppercase">Reasoning Score</p>
			<p class="text-6xl font-black">{totalScore}</p>
			<div class="mt-3 flex flex-wrap gap-2">
				<Badge tone="success">{correctAnswers} correct</Badge>
				<Badge tone="danger">{wrongAnswers} wrong</Badge>
				{#if isSuspicious}<Badge tone="danger">Suspicious</Badge>{/if}
			</div>
		</div>

		<div class="grid gap-3">
			<div class="grid grid-cols-2 gap-3">
				<div class="border-2 border-[var(--color-border)] bg-white p-3">
					<p class="text-xs font-black uppercase">Challenge Accuracy</p>
					<p class="text-2xl font-black">{formatPercent(accuracy)}</p>
				</div>
				<div class="border-2 border-[var(--color-border)] bg-white p-3">
					<p class="text-xs font-black uppercase">Average Time</p>
					<p class="text-2xl font-black">{formatSeconds(averageTimeSeconds)}</p>
				</div>
				<div class="border-2 border-[var(--color-border)] bg-white p-3">
					<p class="text-xs font-black uppercase">Rating Change</p>
					<p class="text-2xl font-black">{formatSignedNumber(ratingDelta)}</p>
				</div>
				<div class="border-2 border-[var(--color-border)] bg-white p-3">
					<p class="text-xs font-black uppercase">Rank</p>
					<p class="text-2xl font-black">{rankAfter}</p>
				</div>
			</div>
			<ProgressBar value={rankProgress.progressPercent} label="Rank Progress" tone="accent" />
			<p class="text-sm font-bold">
				{#if rankPromoted}
					Promotion: {rankBefore} -> {rankAfter}
				{:else if rankProgress.nextRank}
					{rankProgress.pointsToNextRank} points to {rankProgress.nextRank}
				{:else}
					Top rank reached.
				{/if}
			</p>
		</div>
	</div>
</Card>
