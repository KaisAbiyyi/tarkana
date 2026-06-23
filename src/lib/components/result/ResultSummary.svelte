<script lang="ts">
	import Badge from '$lib/components/primitives/Badge.svelte';
	import Card from '$lib/components/primitives/Card.svelte';
	import ProgressBar from '$lib/components/primitives/ProgressBar.svelte';
	import {
		formatPercent,
		formatSeconds,
		formatSignedNumber,
		labelRank
	} from '$lib/shared/presentation/format';
	import { getI18nContext } from '$lib/i18n/context';

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
	const { locale, t } = getI18nContext();
</script>

<Card tone={rankPromoted ? 'warning' : 'default'} title={t('result.sessionResult')}>
	<div class="grid gap-4 lg:grid-cols-[1fr_1fr]">
		<div>
			<p class="text-sm font-black uppercase">{t('result.reasoningScore')}</p>
			<p class="text-6xl font-black">{totalScore}</p>
			<div class="mt-3 flex flex-wrap gap-2">
				<Badge tone="success">{t('result.correctCount', { count: correctAnswers })}</Badge>
				<Badge tone="danger">{t('result.wrongCount', { count: wrongAnswers })}</Badge>
				{#if isSuspicious}<Badge tone="danger">{t('label.suspicious')}</Badge>{/if}
			</div>
		</div>

		<div class="grid gap-3">
			<div class="grid grid-cols-2 gap-3">
				<div class="border-2 border-[var(--color-border)] bg-white p-3">
					<p class="text-xs font-black uppercase">{t('result.accuracy')}</p>
					<p class="text-2xl font-black">{formatPercent(accuracy, locale)}</p>
				</div>
				<div class="border-2 border-[var(--color-border)] bg-white p-3">
					<p class="text-xs font-black uppercase">{t('dashboard.averageTime')}</p>
					<p class="text-2xl font-black">{formatSeconds(averageTimeSeconds, locale)}</p>
				</div>
				<div class="border-2 border-[var(--color-border)] bg-white p-3">
					<p class="text-xs font-black uppercase">{t('result.ratingChange')}</p>
					<p class="text-2xl font-black">{formatSignedNumber(ratingDelta, locale)}</p>
				</div>
				<div class="border-2 border-[var(--color-border)] bg-white p-3">
					<p class="text-xs font-black uppercase">{t('result.rank')}</p>
					<p class="text-2xl font-black">{labelRank(rankAfter, locale)}</p>
				</div>
			</div>
			<ProgressBar
				value={rankProgress.progressPercent}
				label={t('dashboard.rankProgress')}
				tone="accent"
			/>
			<p class="text-sm font-bold">
				{#if rankPromoted}
					{t('result.promotion', {
						before: labelRank(rankBefore, locale),
						after: labelRank(rankAfter, locale)
					})}
				{:else if rankProgress.nextRank}
					{t('result.pointsToRank', {
						points: rankProgress.pointsToNextRank ?? 0,
						rank: labelRank(rankProgress.nextRank, locale)
					})}
				{:else}
					{t('result.topRank')}
				{/if}
			</p>
		</div>
	</div>
</Card>
