<script lang="ts">
	import gsap from 'gsap';
	import type { WeeklyLeaderboardEntryDto, WeeklyProgressDto } from '$lib/shared/types/leaderboard';
	import PlacementBadge from '$lib/components/primitives/PlacementBadge.svelte';
	import PlayerPublicIdentity from '$lib/components/primitives/PlayerPublicIdentity.svelte';
	import RankBadge from '$lib/components/primitives/RankBadge.svelte';
	import { formatPercent } from '$lib/shared/presentation/format';
	import { getI18nContext } from '$lib/i18n/context';

	type Props = {
		entries: WeeklyLeaderboardEntryDto[];
		currentUserEntry?: WeeklyLeaderboardEntryDto | null;
		currentUserProgress?: WeeklyProgressDto | null;
		currentUserId?: string;
		isQualified?: boolean;
	};

	let {
		entries,
		currentUserEntry,
		currentUserProgress,
		currentUserId,
		isQualified = true
	}: Props = $props();
	const { locale, t } = getI18nContext();

	function animateIn(node: HTMLElement) {
		const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (!isReducedMotion) {
			gsap.fromTo(
				node,
				{ opacity: 0, x: -10 },
				{ opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }
			);
		}
	}

	let isCurrentUserInList = $derived(entries.some((e) => e.userId === currentUserId));
	let pinnedEntry = $derived(!isCurrentUserInList && currentUserEntry ? currentUserEntry : null);

	function formatDelta(delta: number): string {
		return delta > 0 ? `+${delta}` : `${delta}`;
	}
</script>

{#snippet entryRow(entry: WeeklyLeaderboardEntryDto)}
	{@const isCurrent = entry.userId === currentUserId}
	<tr
		use:animateIn
		class="border-b-[3px] border-[var(--color-border)] transition-colors last:border-b-0 hover:bg-gray-50
		{isCurrent
			? 'border-l-8 border-l-[var(--color-accent)] bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20'
			: 'border-l-8 border-l-transparent'}"
		data-current={isCurrent}
	>
		<td class="p-4 whitespace-nowrap">
			<PlacementBadge position={entry.position} />
		</td>
		<td class="p-4 font-black">
			<div class="flex items-center gap-2">
				<PlayerPublicIdentity displayName={entry.displayName} />
				{#if isCurrent}
					<span
						class="rounded-sm bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] font-black text-black uppercase"
					>
						{t('leaderboard.you')}
					</span>
				{/if}
			</div>
		</td>
		<td class="p-4 font-bold">
			<RankBadge rank={entry.rank} />
		</td>
		<td class="p-4 text-lg font-black">{entry.averageScorePerAnswer.toFixed(1)}</td>
		<td class="p-4 font-bold">{formatPercent(entry.averageAccuracy, locale)}</td>
		<td class="p-4 font-bold">{(entry.responseTimeRatio * 100).toFixed(0)}%</td>
		<td class="p-4 font-bold">{entry.totalQuestions}</td>
		<td class="p-4 font-bold">{entry.totalSessions}</td>
		<td class="p-4 font-black">
			<span
				class="inline-block px-1.5 py-0.5 text-xs font-black {entry.weeklyRatingDelta > 0
					? 'bg-emerald-100 text-emerald-800'
					: entry.weeklyRatingDelta < 0
						? 'bg-rose-100 text-rose-800'
						: 'bg-gray-100 text-gray-800'}"
			>
				{formatDelta(entry.weeklyRatingDelta)}
			</span>
		</td>
	</tr>
{/snippet}

{#snippet entryCard(entry: WeeklyLeaderboardEntryDto)}
	{@const isCurrent = entry.userId === currentUserId}
	<article
		use:animateIn
		class="border-[3px] border-[var(--color-border)] p-4 shadow-[var(--shadow-hard-sm)] transition-colors
		{isCurrent
			? 'border-l-8 border-[var(--color-primary)] border-l-[var(--color-accent)] bg-[var(--color-primary)]/10'
			: 'border-l-[3px] bg-white'}"
	>
		<div class="flex items-center justify-between gap-3">
			<div class="flex items-center gap-3">
				<div class="flex-shrink-0">
					<PlacementBadge position={entry.position} />
				</div>
				<div>
					<h3 class="flex flex-wrap items-center gap-2 text-lg leading-tight font-black">
						<PlayerPublicIdentity displayName={entry.displayName} />
						{#if isCurrent}
							<span
								class="rounded-sm bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] font-black text-white uppercase"
							>
								{t('leaderboard.you')}
							</span>
						{/if}
					</h3>
					<div class="mt-1">
						<RankBadge rank={entry.rank} />
					</div>
				</div>
			</div>
			<div class="text-right">
				<div class="text-[10px] font-black text-[var(--color-muted)] uppercase">
					{t('leaderboard.avgScorePerAnswer')}
				</div>
				<div class="text-xl font-black">{entry.averageScorePerAnswer.toFixed(1)}</div>
				<div class="text-xs font-black">
					<span
						class={entry.weeklyRatingDelta > 0
							? 'text-emerald-700'
							: entry.weeklyRatingDelta < 0
								? 'text-rose-700'
								: 'text-gray-600'}
					>
						{formatDelta(entry.weeklyRatingDelta)}
					</span>
				</div>
			</div>
		</div>
		<dl
			class="mt-3 flex flex-wrap items-center gap-4 border-t-2 border-dashed border-[var(--color-border)] pt-3 text-xs"
		>
			<div>
				<dt class="inline font-black text-[var(--color-muted)] uppercase">
					{t('leaderboard.accuracy')}:
				</dt>
				<dd class="ml-1 inline font-black">{formatPercent(entry.averageAccuracy, locale)}</dd>
			</div>
			<div>
				<dt class="inline font-black text-[var(--color-muted)] uppercase">
					{t('leaderboard.timeRatio')}:
				</dt>
				<dd class="ml-1 inline font-black">{(entry.responseTimeRatio * 100).toFixed(0)}%</dd>
			</div>
			<div>
				<dt class="inline font-black text-[var(--color-muted)] uppercase">
					{t('leaderboard.questionsSolved')}:
				</dt>
				<dd class="ml-1 inline font-black">{entry.totalQuestions}</dd>
			</div>
			<div>
				<dt class="inline font-black text-[var(--color-muted)] uppercase">
					{t('leaderboard.sessionsPlayed')}:
				</dt>
				<dd class="ml-1 inline font-black">{entry.totalSessions}</dd>
			</div>
		</dl>
	</article>
{/snippet}

<div class="grid gap-6">
	{#if currentUserEntry}
		<div
			class="flex flex-col gap-3 border-2 border-[var(--color-border)] bg-[var(--color-accent)]/10 p-3 shadow-[var(--shadow-hard-sm)] sm:flex-row sm:items-center sm:justify-between"
		>
			<div class="flex flex-wrap items-center gap-3">
				<div class="text-xl font-black">
					{t('leaderboard.yourPosition')}: #{currentUserEntry.position}
				</div>
				<div class="font-bold">
					{t('leaderboard.avgScorePerAnswer')}: {currentUserEntry.averageScorePerAnswer.toFixed(1)}
				</div>
				<div class="font-bold">
					{t('leaderboard.ratingGain')}: {formatDelta(currentUserEntry.weeklyRatingDelta)}
				</div>
				<div class="text-sm font-semibold text-[var(--color-muted)]">
					{formatPercent(currentUserEntry.averageAccuracy, locale)}
					{t('leaderboard.accuracy')} · {(currentUserEntry.responseTimeRatio * 100).toFixed(0)}%
					{t('leaderboard.timeRatio')} · {currentUserEntry.totalQuestions}
					{t('leaderboard.questionsSolved')}
				</div>
			</div>
		</div>
	{:else if !isQualified && currentUserProgress}
		<div
			class="border-2 border-dashed border-amber-500 bg-amber-50 p-4 shadow-[var(--shadow-hard-sm)]"
		>
			<div class="flex flex-wrap items-center gap-2">
				<span
					class="border border-amber-600 bg-amber-200 px-2 py-0.5 text-xs font-black text-amber-900 uppercase"
				>
					{t('leaderboard.provisionalTitle')}
				</span>
				<span class="text-sm font-black text-amber-900">
					{t('leaderboard.avgScorePerAnswer')}: {currentUserProgress.averageScorePerAnswer.toFixed(
						1
					)} · {formatDelta(currentUserProgress.weeklyRatingDelta)}
				</span>
			</div>
			<p class="mt-2 text-xs font-bold text-amber-800">
				{t('leaderboard.weeklyUnqualifiedProgress', {
					questions: currentUserProgress.totalQuestions,
					needed: currentUserProgress.questionsNeeded
				})}
			</p>
		</div>
	{/if}

	{#if entries.length === 0}
		<div class="border-[3px] border-dashed border-[var(--color-border)] bg-white p-8 text-center">
			<p class="text-xl font-black">{t('leaderboard.noQualifiedWeekly')}</p>
			<p class="mt-2 text-sm font-semibold text-[var(--color-muted)]">
				{t('leaderboard.weeklyIntro')}
			</p>
		</div>
	{:else}
		<div class="grid gap-3 md:hidden">
			{#if pinnedEntry}
				<div class="relative">
					<div
						class="absolute -top-3 left-4 z-10 border-2 border-[var(--color-border)] bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-black uppercase"
					>
						{t('leaderboard.yourPosition')}
					</div>
					{@render entryCard(pinnedEntry)}
				</div>
				<div class="my-2 h-1 w-full bg-[var(--color-border)]"></div>
			{/if}

			{#each entries as entry (entry.userId)}
				{@render entryCard(entry)}
			{/each}
		</div>

		<div
			class="hidden overflow-x-auto border-[3px] border-[var(--color-border)] bg-white shadow-[var(--shadow-hard)] md:block"
		>
			<table
				class="w-full min-w-[800px] border-collapse text-left"
				aria-label="Weekly performance leaderboard table"
			>
				<thead class="bg-[var(--color-primary)]">
					<tr>
						<th scope="col" class="w-24 border-b-[3px] border-[var(--color-border)] p-4 font-black">
							{t('leaderboard.position')}
						</th>
						<th scope="col" class="border-b-[3px] border-[var(--color-border)] p-4 font-black">
							{t('leaderboard.playerName')}
						</th>
						<th scope="col" class="border-b-[3px] border-[var(--color-border)] p-4 font-black">
							{t('leaderboard.rank')}
						</th>
						<th scope="col" class="border-b-[3px] border-[var(--color-border)] p-4 font-black">
							{t('leaderboard.avgScorePerAnswer')}
						</th>
						<th scope="col" class="border-b-[3px] border-[var(--color-border)] p-4 font-black">
							{t('leaderboard.accuracy')}
						</th>
						<th scope="col" class="border-b-[3px] border-[var(--color-border)] p-4 font-black">
							{t('leaderboard.timeRatio')}
						</th>
						<th scope="col" class="border-b-[3px] border-[var(--color-border)] p-4 font-black">
							{t('leaderboard.questionsSolved')}
						</th>
						<th scope="col" class="border-b-[3px] border-[var(--color-border)] p-4 font-black">
							{t('leaderboard.sessionsPlayed')}
						</th>
						<th scope="col" class="border-b-[3px] border-[var(--color-border)] p-4 font-black">
							{t('leaderboard.ratingGain')}
						</th>
					</tr>
				</thead>
				<tbody>
					{#if pinnedEntry}
						{@render entryRow(pinnedEntry)}
						<tr class="border-b-[3px] border-[var(--color-border)] bg-gray-100">
							<td
								colspan="9"
								class="p-2 text-center text-xs font-black text-[var(--color-muted)] uppercase"
							>
								•••
							</td>
						</tr>
					{/if}
					{#each entries as entry (entry.userId)}
						{@render entryRow(entry)}
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
