<script lang="ts">
	import Button from '$lib/components/primitives/Button.svelte';
	import Card from '$lib/components/primitives/Card.svelte';
	import ProgressBar from '$lib/components/primitives/ProgressBar.svelte';
	import RecentSessions from '$lib/components/dashboard/RecentSessions.svelte';
	import StatTile from '$lib/components/dashboard/StatTile.svelte';
	import type { DashboardStatsDto } from '$lib/shared/types/dashboard';
	import { formatPercent, formatSeconds, labelRank } from '$lib/shared/presentation/format';
	import { getI18nContext } from '$lib/i18n/context';

	type Props = {
		stats: DashboardStatsDto;
	};

	let { stats }: Props = $props();
	const { locale, t } = getI18nContext();

	// Avoid logic rating calculations if UNRANKED
	let isUnranked = $derived(stats.currentRank === 'Unranked');
	let progressValue = $derived(isUnranked ? 0 : stats.logicRating % 500);
</script>

<section class="grid gap-8">
	<header class="ink-panel grid gap-6 bg-white p-5 md:p-7 lg:grid-cols-[1fr_360px] lg:items-center">
		<div class="space-y-4">
			<p class="page-kicker">{t('nav.dashboard')}</p>
			{#if isUnranked}
				<h1 class="page-title">{t('label.unranked')}</h1>
			{:else}
				<h1 class="page-title">{t('common.logicRating')} {stats.logicRating}</h1>
			{/if}
			<p class="max-w-2xl text-lg font-semibold text-[var(--color-muted)]">
				{t('dashboard.improve')}
			</p>
			<div class="grid max-w-2xl gap-3 sm:grid-cols-3">
				<div class="border-[3px] border-[var(--color-border)] bg-[var(--color-primary)] p-4">
					<p class="text-xs font-black uppercase">{t('dashboard.currentRank')}</p>
					<p class="text-2xl font-black">{labelRank(stats.currentRank, locale)}</p>
				</div>
				<div class="border-[3px] border-[var(--color-border)] bg-[var(--color-accent)] p-4">
					<p class="text-xs font-black uppercase">{t('dashboard.sessionsCompleted')}</p>
					<p class="text-2xl font-black">{stats.totalCompleted}</p>
				</div>
				<div class="border-[3px] border-[var(--color-border)] bg-white p-4">
					<p class="text-xs font-black uppercase">{t('dashboard.bestScore')}</p>
					<p class="text-2xl font-black">{stats.bestScore}</p>
				</div>
			</div>
		</div>
		<div class="border-[3px] border-[var(--color-border)] bg-[var(--color-paper)] p-5">
			<p class="text-sm font-black uppercase">{t('dashboard.nextChallenge')}</p>
			<p class="mt-2 text-3xl font-black">{t('dashboard.continue')}</p>
			<p class="mt-2 text-sm font-bold text-[var(--color-muted)]">
				{t('dashboard.tenQuestions')}
			</p>
			<Button href="/challenge" size="lg" class="mt-5 w-full"
				>{t('dashboard.startChallenge')}</Button
			>
		</div>
	</header>

	<div class="grid gap-4 sm:grid-cols-2">
		<StatTile
			label={t('dashboard.averageAccuracy')}
			value={stats.totalCompleted > 0 ? formatPercent(stats.averageAccuracy, locale) : '—'}
			tone="lime"
		/>
		<StatTile
			label={t('dashboard.averageTime')}
			value={stats.totalCompleted > 0 ? formatSeconds(stats.averageSolveTimeSeconds, locale) : '—'}
			tone="white"
		/>
	</div>

	<div class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
		<Card title={t('dashboard.rankProgress')} description={t('dashboard.nextTier')}>
			{#if isUnranked}
				<div class="py-4 text-center">
					<p class="font-bold text-[var(--color-muted)]">
						{t('dashboard.needMore')}
					</p>
				</div>
			{:else}
				<ProgressBar
					value={progressValue}
					max={500}
					label={t('dashboard.rankProgress')}
					tone="accent"
				/>
				<p class="mt-4 text-sm font-bold text-[var(--color-muted)]">
					{t('dashboard.pointsToTier', { points: 500 - progressValue })}
				</p>
			{/if}
		</Card>

		<Card title={t('dashboard.categoryMastery')}>
			{#if !stats.strongestCategory && !stats.weakestCategory}
				<div
					class="border-2 border-dashed border-[var(--color-border)] bg-[var(--color-paper)] p-4 text-center"
				>
					<p class="font-bold text-[var(--color-muted)]">
						{t('dashboard.categoryEmpty')}
					</p>
				</div>
			{:else}
				<div class="grid gap-3 sm:grid-cols-2">
					{#if stats.strongestCategory}
						<div class="border-[3px] border-[var(--color-border)] bg-[var(--color-accent)] p-4">
							<p class="text-xs font-black uppercase">{t('dashboard.strongest')}</p>
							<p class="mt-1 font-bold">{stats.strongestCategory}</p>
						</div>
					{/if}
					{#if stats.weakestCategory}
						<div class="border-[3px] border-[var(--color-border)] bg-[var(--color-blue)] p-4">
							<p class="text-xs font-black uppercase">{t('dashboard.improveCategory')}</p>
							<p class="mt-1 font-bold">{stats.weakestCategory}</p>
						</div>
					{/if}
				</div>
			{/if}
		</Card>
	</div>

	<div>
		<Card title={t('dashboard.recentSessions')}>
			<RecentSessions sessions={stats.recentSessions} />
		</Card>
	</div>
</section>
