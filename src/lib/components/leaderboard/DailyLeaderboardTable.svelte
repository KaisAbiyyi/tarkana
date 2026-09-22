<script lang="ts">
	import gsap from 'gsap';
	import type {
		DailyLeaderboardEntryDto,
		GuestHypotheticalRankDto
	} from '$lib/shared/types/leaderboard';
	import RankBadge from '$lib/components/primitives/RankBadge.svelte';
	import PlacementBadge from '$lib/components/primitives/PlacementBadge.svelte';
	import PlayerPublicIdentity from '$lib/components/primitives/PlayerPublicIdentity.svelte';
	import { formatPercent, formatSeconds } from '$lib/shared/presentation/format';
	import { getI18nContext } from '$lib/i18n/context';
	import Button from '$lib/components/primitives/Button.svelte';

	type Props = {
		entries: DailyLeaderboardEntryDto[];
		currentUserEntry?: DailyLeaderboardEntryDto | null;
		guestHypotheticalEntry?: GuestHypotheticalRankDto | null;
	};

	let { entries, currentUserEntry, guestHypotheticalEntry }: Props = $props();
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

	let isCurrentUserInList = $derived(entries.some((e) => e.isCurrent));
	let pinnedEntry = $derived(!isCurrentUserInList && currentUserEntry ? currentUserEntry : null);
</script>

<!-- Guest Conversion Callout -->
{#if guestHypotheticalEntry}
	<aside
		class="mb-6 border-[3px] border-[var(--color-accent)] bg-amber-50 p-4 shadow-[var(--shadow-hard-sm)]"
		aria-label="Guest ranking notification"
	>
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<p class="font-black text-amber-950">
					🎯 {t('leaderboard.guestClaimPrompt', {
						position: guestHypotheticalEntry.hypotheticalPosition
					})}
				</p>
				<p class="mt-1 text-xs font-semibold text-amber-800">
					Score: {guestHypotheticalEntry.score} pts · Accuracy: {formatPercent(
						guestHypotheticalEntry.accuracy,
						locale
					)} · Time: {formatSeconds(guestHypotheticalEntry.totalTimeSeconds, locale)}
				</p>
			</div>
			<Button href="/auth/register" variant="primary" size="sm" class="whitespace-nowrap">
				{t('nav.register')}
			</Button>
		</div>
	</aside>
{/if}

{#if entries.length === 0}
	<div class="border-[3px] border-dashed border-[var(--color-border)] p-12 text-center">
		<p class="text-lg font-bold text-[var(--color-muted)]">
			{t('leaderboard.noParticipantsToday')}
		</p>
		<Button href="/daily" variant="primary" class="mt-4">
			{t('dashboard.startChallenge')}
		</Button>
	</div>
{:else}
	<!-- Desktop Table View -->
	<div class="hidden overflow-x-auto md:block">
		<table class="w-full border-collapse text-left" aria-label="Daily challenge leaderboard">
			<thead>
				<tr
					class="border-b-[3px] border-[var(--color-border)] bg-[var(--color-paper)] text-xs font-black text-[var(--color-muted)] uppercase"
				>
					<th scope="col" class="w-20 p-4">{t('leaderboard.position')}</th>
					<th scope="col" class="p-4">{t('leaderboard.playerName')}</th>
					<th scope="col" class="p-4">{t('leaderboard.logicRank')}</th>
					<th scope="col" class="p-4">{t('leaderboard.score')}</th>
					<th scope="col" class="p-4">{t('leaderboard.accuracy')}</th>
					<th scope="col" class="p-4">{t('leaderboard.solveTime')}</th>
				</tr>
			</thead>
			<tbody>
				{#each entries as entry (entry.position)}
					{@const isCurrent = entry.isCurrent}
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
						<td class="p-4">
							<RankBadge rank={entry.logicRank} />
						</td>
						<td class="p-4 text-lg font-black text-[var(--color-text)]">
							{entry.score}
						</td>
						<td class="p-4 font-bold text-[var(--color-text)]">
							{formatPercent(entry.accuracy, locale)}
						</td>
						<td class="p-4 font-mono font-bold text-[var(--color-text)]">
							{formatSeconds(entry.totalTimeSeconds, locale)}
						</td>
					</tr>
				{/each}

				{#if pinnedEntry}
					<tr
						class="border-t-4 border-l-8 border-[var(--color-accent)] border-l-[var(--color-accent)] bg-[var(--color-primary)]/15"
						data-current="true"
					>
						<td class="p-4 whitespace-nowrap">
							<PlacementBadge position={pinnedEntry.position} />
						</td>
						<td class="p-4 font-black">
							<div class="flex items-center gap-2">
								<PlayerPublicIdentity displayName={pinnedEntry.displayName} />
								<span
									class="rounded-sm bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] font-black text-black uppercase"
								>
									{t('leaderboard.you')}
								</span>
							</div>
						</td>
						<td class="p-4">
							<RankBadge rank={pinnedEntry.logicRank} />
						</td>
						<td class="p-4 text-lg font-black">{pinnedEntry.score}</td>
						<td class="p-4 font-bold">{formatPercent(pinnedEntry.accuracy, locale)}</td>
						<td class="p-4 font-mono font-bold"
							>{formatSeconds(pinnedEntry.totalTimeSeconds, locale)}</td
						>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Mobile Card View -->
	<div class="flex flex-col gap-3 md:hidden">
		{#each entries as entry (entry.position)}
			{@const isCurrent = entry.isCurrent}
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
							<h3 class="flex flex-wrap items-center gap-2 text-base font-black">
								<PlayerPublicIdentity displayName={entry.displayName} />
								{#if isCurrent}
									<span
										class="rounded-sm bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] font-black text-black uppercase"
									>
										{t('leaderboard.you')}
									</span>
								{/if}
							</h3>
							<div class="mt-1 flex items-center gap-2">
								<RankBadge rank={entry.logicRank} />
							</div>
						</div>
					</div>
					<div class="text-right">
						<div class="text-xs font-black text-[var(--color-muted)] uppercase">
							{t('leaderboard.score')}
						</div>
						<div class="text-xl font-black">{entry.score}</div>
					</div>
				</div>

				<dl
					class="mt-3 flex items-center justify-between border-t-2 border-dashed border-[var(--color-border)] pt-2 text-xs"
				>
					<div>
						<dt class="inline font-bold text-[var(--color-muted)]">{t('leaderboard.accuracy')}:</dt>
						<dd class="ml-1 inline font-black">{formatPercent(entry.accuracy, locale)}</dd>
					</div>
					<div>
						<dt class="inline font-bold text-[var(--color-muted)]">
							{t('leaderboard.solveTime')}:
						</dt>
						<dd class="ml-1 inline font-mono font-black">
							{formatSeconds(entry.totalTimeSeconds, locale)}
						</dd>
					</div>
				</dl>
			</article>
		{/each}

		{#if pinnedEntry}
			<aside
				class="mt-2 border-4 border-[var(--color-accent)] bg-[var(--color-primary)]/15 p-4 shadow-[var(--shadow-hard-sm)]"
			>
				<div class="mb-2 text-xs font-black text-[var(--color-muted)] uppercase">
					{t('leaderboard.yourPosition')}
				</div>
				<div class="flex items-center justify-between gap-3">
					<div class="flex items-center gap-3">
						<PlacementBadge position={pinnedEntry.position} />
						<div>
							<h3 class="text-base font-black">
								<PlayerPublicIdentity displayName={pinnedEntry.displayName} />
							</h3>
							<div class="mt-1">
								<RankBadge rank={pinnedEntry.logicRank} />
							</div>
						</div>
					</div>
					<div class="text-right">
						<div class="text-xs font-black text-[var(--color-muted)] uppercase">
							{t('leaderboard.score')}
						</div>
						<div class="text-xl font-black">{pinnedEntry.score}</div>
					</div>
				</div>
				<dl
					class="mt-3 flex items-center justify-between border-t-2 border-dashed border-[var(--color-border)] pt-2 text-xs"
				>
					<div>
						<dt class="inline font-bold text-[var(--color-muted)]">{t('leaderboard.accuracy')}:</dt>
						<dd class="ml-1 inline font-black">{formatPercent(pinnedEntry.accuracy, locale)}</dd>
					</div>
					<div>
						<dt class="inline font-bold text-[var(--color-muted)]">
							{t('leaderboard.solveTime')}:
						</dt>
						<dd class="ml-1 inline font-mono font-black">
							{formatSeconds(pinnedEntry.totalTimeSeconds, locale)}
						</dd>
					</div>
				</dl>
			</aside>
		{/if}
	</div>
{/if}
