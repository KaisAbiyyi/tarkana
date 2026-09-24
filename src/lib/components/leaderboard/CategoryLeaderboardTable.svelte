<script lang="ts">
	import gsap from 'gsap';
	import type { CategoryLeaderboardEntryDto } from '$lib/shared/types/leaderboard';
	import PlacementBadge from '$lib/components/primitives/PlacementBadge.svelte';
	import PlayerPublicIdentity from '$lib/components/primitives/PlayerPublicIdentity.svelte';
	import { formatPercent, labelQuestionType } from '$lib/shared/presentation/format';
	import { getI18nContext } from '$lib/i18n/context';

	type Props = {
		entries: CategoryLeaderboardEntryDto[];
		currentUserEntry?: CategoryLeaderboardEntryDto | null;
		currentUserId?: string;
		provisionalProgress?: {
			totalQuestions: number;
			totalSessions: number;
			rating: number;
		} | null;
		isQualified?: boolean;
	};

	let {
		entries,
		currentUserEntry,
		currentUserId,
		provisionalProgress,
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
</script>

{#snippet entryRow(entry: CategoryLeaderboardEntryDto)}
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
			<span
				class="inline-block border-2 border-[var(--color-border)] bg-[var(--color-paper)] px-2 py-0.5 text-xs font-black uppercase"
			>
				{labelQuestionType(entry.questionType, locale)}
			</span>
		</td>
		<td class="p-4 text-lg font-black">{entry.masteryRating}</td>
		<td class="p-4 font-bold">{formatPercent(entry.accuracy, locale)}</td>
		<td class="p-4 font-bold">{entry.totalQuestions}</td>
		<td class="p-4 font-bold">{entry.totalSessions}</td>
	</tr>
{/snippet}

{#snippet entryCard(entry: CategoryLeaderboardEntryDto)}
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
						<span
							class="inline-block border border-[var(--color-border)] bg-[var(--color-paper)] px-1.5 py-0.5 text-[10px] font-black uppercase"
						>
							{labelQuestionType(entry.questionType, locale)}
						</span>
					</div>
				</div>
			</div>
			<div class="text-right">
				<div class="text-[10px] font-black text-[var(--color-muted)] uppercase">
					{t('leaderboard.masteryRating')}
				</div>
				<div class="text-xl font-black">{entry.masteryRating}</div>
			</div>
		</div>
		<dl
			class="mt-3 flex items-center gap-4 border-t-2 border-dashed border-[var(--color-border)] pt-3 text-xs"
		>
			<div>
				<dt class="inline font-black text-[var(--color-muted)] uppercase">
					{t('leaderboard.accuracy')}:
				</dt>
				<dd class="ml-1 inline font-black">{formatPercent(entry.accuracy, locale)}</dd>
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
					{t('leaderboard.masteryRating')}: {currentUserEntry.masteryRating}
				</div>
				<div class="text-sm font-semibold text-[var(--color-muted)]">
					{formatPercent(currentUserEntry.accuracy, locale)}
					{t('leaderboard.accuracy')} · {currentUserEntry.totalQuestions}
					{t('leaderboard.questionsSolved')}
				</div>
			</div>
		</div>
	{:else if !isQualified && provisionalProgress}
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
					{t('leaderboard.rating')}: {provisionalProgress.rating}
				</span>
			</div>
			<p class="mt-2 text-xs font-bold text-amber-800">
				{t('leaderboard.provisionalProgress', {
					questions: provisionalProgress.totalQuestions,
					sessions: provisionalProgress.totalSessions
				})}
			</p>
		</div>
	{/if}

	{#if entries.length === 0}
		<div class="border-[3px] border-dashed border-[var(--color-border)] bg-white p-8 text-center">
			<p class="text-xl font-black">{t('leaderboard.noQualifiedPlayers')}</p>
			<p class="mt-2 text-sm font-semibold text-[var(--color-muted)]">
				{t('leaderboard.categoryIntro')}
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
				aria-label="Category leaderboard table"
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
							{t('leaderboard.category')}
						</th>
						<th scope="col" class="border-b-[3px] border-[var(--color-border)] p-4 font-black">
							{t('leaderboard.masteryRating')}
						</th>
						<th scope="col" class="border-b-[3px] border-[var(--color-border)] p-4 font-black">
							{t('leaderboard.accuracy')}
						</th>
						<th scope="col" class="border-b-[3px] border-[var(--color-border)] p-4 font-black">
							{t('leaderboard.questionsSolved')}
						</th>
						<th scope="col" class="border-b-[3px] border-[var(--color-border)] p-4 font-black">
							{t('leaderboard.sessionsPlayed')}
						</th>
					</tr>
				</thead>
				<tbody>
					{#if pinnedEntry}
						{@render entryRow(pinnedEntry)}
						<tr class="border-b-[3px] border-[var(--color-border)] bg-gray-100">
							<td
								colspan="7"
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
