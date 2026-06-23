<script lang="ts">
	import type { PageData } from './$types';
	import { resolveRoute } from '$app/paths';

	import gsap from 'gsap';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import Button from '$lib/components/primitives/Button.svelte';
	import {
		formatDateTime,
		formatPercent,
		formatSeconds,
		formatSignedNumber,
		formatNumber,
		labelAchievement,
		labelMode,
		labelSessionType,
		labelSessionStatus
	} from '$lib/shared/presentation/format';
	import type { SessionListItemDto } from '$lib/shared/types/challenge';
	import { getI18nContext } from '$lib/i18n/context';

	let { data }: { data: PageData } = $props();
	const { locale, t } = getI18nContext();
	let history = $derived(data.history);
	let currentFilter = $derived(data.filter);

	// Filters
	const filters = [
		{ id: 'all', label: t('history.all') },
		{ id: 'mixed', label: t('label.mixed') },
		{ id: 'number_sequence', label: t('category.number') },
		{ id: 'symbol_pattern', label: t('category.symbol') },
		{ id: 'mini_deduction', label: t('category.deduction') },
		{ id: 'memory_pattern', label: t('category.memory') }
	];

	// Animation
	let listContainer: HTMLElement | undefined = $state();

	$effect(() => {
		// Run animation on filter change if items exist
		if (listContainer && history.items.length > 0) {
			const mm = gsap.matchMedia();
			mm.add('(prefers-reduced-motion: no-preference)', () => {
				gsap.fromTo(
					listContainer?.children || [],
					{ y: 20, opacity: 0 },
					{ y: 0, opacity: 1, duration: 0.3, stagger: 0.05, ease: 'power2.out', clearProps: 'all' }
				);
			});
		}
	});

	function groupSessionsByDate(items: SessionListItemDto[]) {
		const groups: Record<string, SessionListItemDto[]> = {};
		for (const item of items) {
			const dateStr = formatDateTime(item.createdAt, locale).split(',')[0];
			if (!groups[dateStr]) groups[dateStr] = [];
			groups[dateStr].push(item);
		}
		return Object.entries(groups).map(([date, sessions]) => ({ date, sessions }));
	}

	let groupedSessions = $derived(groupSessionsByDate(history.items));
</script>

<svelte:head>
	<title>{t('history.title')}</title>
	<meta name="description" content={t('history.meta')} />
</svelte:head>

{#snippet mixedMotif()}
	<div class="motif-mixed"><span></span><span></span><span></span><span></span></div>
{/snippet}
{#snippet numberMotif()}
	<div class="motif-number"><span></span><span></span><span></span></div>
{/snippet}
{#snippet symbolMotif()}
	<div class="motif-symbol"><span></span><span></span></div>
{/snippet}
{#snippet deductionMotif()}
	<svg viewBox="0 0 24 24" class="motif-svg" fill="none" stroke="currentColor" stroke-width="3"
		><circle cx="6" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><path d="m8 8 8 8" /></svg
	>
{/snippet}
{#snippet memoryMotif()}
	<div class="motif-memory">
		{#each [0, 1, 2, 3, 4, 5, 6, 7, 8] as index (index)}<span class:filled={index % 2 === 0}
			></span>{/each}
	</div>
{/snippet}

<section class="grid gap-8 pb-12">
	<header>
		<p class="page-kicker">{t('history.progress')}</p>
		<h1 class="page-title">{t('history.roundHistory')}</h1>
		<p class="mt-3 max-w-2xl text-lg font-semibold text-[var(--color-muted)]">
			{t('history.intro')}
		</p>
	</header>

	<!-- Real-data Summary -->
	<section class="grid grid-cols-2 gap-4 lg:grid-cols-4">
		<div
			class="border-[3px] border-[var(--color-border)] bg-[var(--color-paper)] p-4 shadow-[var(--shadow-hard-sm)]"
		>
			<p
				class="mb-1 text-xs font-bold tracking-wider text-[var(--color-muted)] uppercase md:text-sm"
			>
				{t('dashboard.sessionsCompleted')}
			</p>
			<p class="text-2xl font-black md:text-3xl">
				{history.summary.totalCompleted !== null
					? formatNumber(history.summary.totalCompleted, locale)
					: '-'}
			</p>
			{#if currentFilter !== 'all'}
				<p class="mt-1 text-xs font-semibold text-[var(--color-muted)]">
					{t('history.activeFilter')}
				</p>
			{/if}
		</div>
		<div
			class="border-[3px] border-[var(--color-border)] bg-[var(--color-paper)] p-4 shadow-[var(--shadow-hard-sm)]"
		>
			<p
				class="mb-1 text-xs font-bold tracking-wider text-[var(--color-muted)] uppercase md:text-sm"
			>
				{t('dashboard.averageAccuracy')}
			</p>
			<p class="text-2xl font-black md:text-3xl">
				{history.summary.totalCompleted > 0
					? formatPercent(history.summary.averageAccuracy, locale)
					: '-'}
			</p>
			{#if currentFilter !== 'all'}
				<p class="mt-1 text-xs font-semibold text-[var(--color-muted)]">
					{t('history.activeFilter')}
				</p>
			{/if}
		</div>
		<div
			class="border-[3px] border-[var(--color-border)] bg-[var(--color-paper)] p-4 shadow-[var(--shadow-hard-sm)]"
		>
			<p
				class="mb-1 text-xs font-bold tracking-wider text-[var(--color-muted)] uppercase md:text-sm"
			>
				{t('dashboard.bestScore')}
			</p>
			<p class="text-2xl font-black md:text-3xl">
				{history.summary.totalCompleted > 0 ? formatNumber(history.summary.bestScore, locale) : '-'}
			</p>
			{#if currentFilter !== 'all'}
				<p class="mt-1 text-xs font-semibold text-[var(--color-muted)]">
					{t('history.activeFilter')}
				</p>
			{/if}
		</div>
		<div
			class="border-[3px] border-[var(--color-border)] bg-[var(--color-paper)] p-4 shadow-[var(--shadow-hard-sm)]"
		>
			<p
				class="mb-1 text-xs font-bold tracking-wider text-[var(--color-muted)] uppercase md:text-sm"
			>
				{t('result.ratingChange')}
			</p>
			<p
				class="text-2xl font-black md:text-3xl {history.summary.totalRatingDelta !== null &&
				history.summary.totalRatingDelta > 0
					? 'text-[var(--color-success-dark)]'
					: history.summary.totalRatingDelta !== null && history.summary.totalRatingDelta < 0
						? 'text-[var(--color-danger-dark)]'
						: ''}"
			>
				{history.summary.totalCompleted > 0 && history.summary.totalRatingDelta !== null
					? formatSignedNumber(history.summary.totalRatingDelta, locale)
					: '—'}
			</p>
			{#if currentFilter !== 'all'}
				<p class="mt-1 text-xs font-semibold text-[var(--color-muted)]">
					{t('history.activeFilter')}
				</p>
			{/if}
		</div>
	</section>

	<!-- Filters -->
	<section>
		<nav class="flex flex-wrap gap-2" aria-label={t('history.filterLabel')}>
			{#each filters as f (f.id)}
				<a
					href="{resolveRoute('/history')}?filter={f.id}"
					class="border-2 px-3 py-2 text-sm font-bold transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-accent)] active:scale-95 md:px-4 md:text-base {currentFilter ===
					f.id
						? 'border-[var(--color-border)] bg-[var(--color-accent)] text-white shadow-[var(--shadow-hard-sm)]'
						: 'border-[var(--color-border)] bg-white text-[var(--color-text)] hover:-translate-y-0.5 hover:bg-[var(--color-paper)] hover:shadow-[var(--shadow-hard-sm)]'}"
					aria-current={currentFilter === f.id ? 'page' : undefined}
				>
					{f.label} ({history.filterCounts?.[f.id] ?? 0})
				</a>
			{/each}
		</nav>
	</section>

	<!-- Session List -->
	<section>
		<h2 class="mb-6 text-2xl font-black">{t('dashboard.recentSessions')}</h2>

		{#if history.total === 0 && currentFilter === 'all'}
			<div
				class="border-[3px] border-dashed border-[var(--color-border)] bg-[var(--color-paper)] p-8 text-center"
			>
				<h3 class="mb-2 text-xl font-black">{t('history.noRounds')}</h3>
				<p class="mb-6 font-semibold text-[var(--color-muted)]">
					{t('history.firstRoundBody')}
				</p>
				<Button href="/challenge">{t('history.startFirst')}</Button>
			</div>
		{:else if history.items.length === 0}
			<div
				class="border-[3px] border-dashed border-[var(--color-border)] bg-[var(--color-paper)] p-8 text-center"
			>
				<h3 class="mb-2 text-xl font-black">{t('history.noMatch')}</h3>
				<p class="mb-6 font-semibold text-[var(--color-muted)]">
					{t('history.noMatchBody')}
				</p>
				<Button href="/history?filter=all" variant="ghost">{t('history.resetFilter')}</Button>
			</div>
		{:else}
			<div class="grid gap-8" bind:this={listContainer}>
				{#each groupedSessions as group (group.date)}
					<div class="grid gap-4">
						<h3
							class="sticky top-16 z-10 inline-block w-fit border-2 border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-1 text-sm font-black tracking-widest uppercase shadow-[var(--shadow-hard-sm)]"
						>
							{group.date}
						</h3>
						<div class="grid gap-4 md:ml-4">
							{#each group.sessions as session (session.id)}
								<article
									class="grid gap-4 border-2 border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-hard-sm)] transition-transform hover:-translate-y-1 hover:shadow-[var(--shadow-hard)] lg:grid-cols-[1fr_auto] lg:items-center"
								>
									<div>
										<div class="mb-2 flex flex-wrap items-center gap-2">
											<Badge tone="accent">
												<span class="flex items-center gap-1.5">
													{#if session.mode === 'mixed'}
														{@render mixedMotif()}
													{:else if session.mode === 'number_sequence'}
														{@render numberMotif()}
													{:else if session.mode === 'symbol_pattern'}
														{@render symbolMotif()}
													{:else if session.mode === 'mini_deduction'}
														{@render deductionMotif()}
													{:else if session.mode === 'memory_pattern'}
														{@render memoryMotif()}
													{/if}
													{labelMode(session.mode, locale)}
												</span>
											</Badge>
											<span class="text-sm font-semibold text-[var(--color-muted)]">
												{labelSessionType(session, locale)} · {t('history.questions', {
													count: session.totalQuestions
												})}
											</span>
											<Badge
												tone={session.status === 'suspicious'
													? 'danger'
													: session.status === 'completed'
														? 'success'
														: 'warning'}
											>
												{session.status === 'completed'
													? t('label.completed')
													: labelSessionStatus(session.status, locale)}
											</Badge>
											<time
												class="text-sm font-semibold text-[var(--color-muted)]"
												datetime={session.createdAt}
											>
												{formatDateTime(session.createdAt, locale)}
											</time>
										</div>

										<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-bold">
											<span class="flex items-center gap-1">
												<span class="text-sm tracking-wider text-[var(--color-muted)] uppercase"
													>{t('arena.score')}</span
												>
												<span class="text-lg text-[var(--color-text)]"
													>{formatNumber(session.totalScore, locale)}</span
												>
											</span>
											<span class="flex items-center gap-1">
												<span class="text-sm tracking-wider text-[var(--color-muted)] uppercase"
													>{t('result.accuracy')}</span
												>
												<span class="text-lg text-[var(--color-text)]"
													>{formatPercent(session.accuracy, locale)}</span
												>
											</span>
											<span class="flex items-center gap-1">
												<span class="text-sm tracking-wider text-[var(--color-muted)] uppercase"
													>{t('history.average')}</span
												>
												<span class="text-lg text-[var(--color-text)]"
													>{formatSeconds(session.averageTimeSeconds, locale)}</span
												>
											</span>
											{#if session.rankBefore !== 'Unranked' || session.rankAfter !== 'Unranked'}
												<span class="flex items-center gap-1">
													<span class="text-sm tracking-wider text-[var(--color-muted)] uppercase"
														>{t('common.logicRating')}</span
													>
													<span class="flex items-center gap-1 text-lg">
														{formatNumber(session.ratingBefore, locale)}
														<span class="text-sm opacity-50">→</span>
														<span>{formatNumber(session.ratingAfter, locale)}</span>
														<span
															class="ml-1 text-base {session.ratingDelta > 0
																? 'text-[var(--color-success-dark)]'
																: session.ratingDelta < 0
																	? 'text-[var(--color-danger-dark)]'
																	: 'text-[var(--color-text)]'}"
														>
															({formatSignedNumber(session.ratingDelta, locale)})
														</span>
													</span>
												</span>
											{/if}
										</div>

										{#if session.validAchievements && session.validAchievements.length > 0}
											<div class="mt-3 flex flex-wrap gap-2">
												{#each session.validAchievements as badge (badge)}
													<span
														class="inline-block border border-[var(--color-border)] bg-[var(--color-accent)] px-2 py-0.5 text-xs font-black tracking-wider text-white uppercase"
													>
														✨ {labelAchievement(badge, locale)}
													</span>
												{/each}
											</div>
										{/if}
									</div>
									<div class="flex flex-wrap items-center gap-3 pt-2 lg:justify-end lg:pt-0">
										<Button
											href={`/result/${session.id}`}
											size="sm"
											variant="ghost"
											label={t('history.viewRound', { mode: labelMode(session.mode, locale) })}
											>{t('history.viewResult')}</Button
										>
									</div>
								</article>
							{/each}
						</div>
					</div>
				{/each}
			</div>

			{#if (history.total || 0) > history.items.length}
				<div class="mt-8 text-center">
					<p class="mb-4 font-semibold text-[var(--color-muted)]">
						{t('history.showing', { shown: history.items.length, total: history.total ?? 0 })}
					</p>
					<Button href={`?filter=${currentFilter}&offset=${history.items.length}`} variant="ghost">
						{t('history.loadMore')}
					</Button>
				</div>
			{/if}

			<div
				class="mt-8 rounded-lg border-[3px] border-[var(--color-border)] bg-[var(--color-paper)] p-6 text-center shadow-[var(--shadow-hard-sm)]"
			>
				<h2 class="mb-2 text-2xl font-black">{t('history.readyMore')}</h2>
				<p class="mb-4 font-semibold text-[var(--color-muted)]">
					{t('history.playMoreBody')}
				</p>
				<Button href="/challenge" size="lg" class="min-h-[44px] w-full sm:w-auto"
					>{t('history.playNext')}</Button
				>
			</div>
		{/if}
	</section>
</section>

<style>
	:global(.motif-svg) {
		width: 1.1rem;
		height: 1.1rem;
	}
	.motif-number {
		display: flex;
		align-items: end;
		gap: 0.15rem;
		height: 1.1rem;
	}
	.motif-number span {
		width: 0.25rem;
		border: 1px solid var(--color-border);
		background: var(--color-ink);
	}
	.motif-number span:nth-child(1) {
		height: 45%;
	}
	.motif-number span:nth-child(2) {
		height: 75%;
	}
	.motif-number span:nth-child(3) {
		height: 100%;
	}

	.motif-mixed {
		display: grid;
		grid-template-columns: repeat(2, 0.45rem);
		gap: 0.1rem;
	}
	.motif-mixed span {
		height: 0.45rem;
		border: 1px solid var(--color-border);
		background: var(--color-paper);
	}
	.motif-mixed span:nth-child(1),
	.motif-mixed span:nth-child(4) {
		background: var(--color-ink);
	}

	.motif-symbol {
		display: flex;
		gap: 0.1rem;
		height: 1.1rem;
		align-items: center;
	}
	.motif-symbol span {
		width: 0.45rem;
		height: 0.45rem;
		border: 1px solid var(--color-border);
		background: var(--color-ink);
	}
	.motif-symbol span:nth-child(1) {
		border-radius: 50%;
	}

	.motif-memory {
		display: grid;
		grid-template-columns: repeat(3, 0.3rem);
		gap: 0.05rem;
	}
	.motif-memory span {
		height: 0.3rem;
		border: 1px solid var(--color-border);
		background: var(--color-paper);
	}
	.motif-memory span.filled {
		background: var(--color-ink);
	}
</style>
