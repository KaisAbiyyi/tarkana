<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import Card from '$lib/components/primitives/Card.svelte';
	import LeaderboardTable from '$lib/components/leaderboard/LeaderboardTable.svelte';
	import DailyLeaderboardTable from '$lib/components/leaderboard/DailyLeaderboardTable.svelte';
	import Button from '$lib/components/primitives/Button.svelte';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import type { LeaderboardEntryDto } from '$lib/shared/types/leaderboard';
	import { getI18nContext } from '$lib/i18n/context';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();
	const { t } = getI18nContext();

	let activeTab = $derived(data.tab as 'daily' | 'global');
	let selectedDate = $derived(data.date);

	// Global leaderboard state
	let globalEntries = $state<LeaderboardEntryDto[]>([]);
	let isLoadingGlobal = $state(false);
	let globalError = $state<string | null>(null);
	let hasMoreGlobal = $state(false);

	// Countdown timer for daily reset
	let elapsedSeconds = $state(0);
	let initialResetSeconds = $derived(data.dailyLeaderboard.secondsUntilReset);
	let secondsLeft = $derived(
		initialResetSeconds !== null ? Math.max(0, initialResetSeconds - elapsedSeconds) : null
	);

	let timer: ReturnType<typeof setInterval> | undefined;

	onMount(() => {
		timer = setInterval(() => {
			elapsedSeconds += 1;
		}, 1000);
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
	});

	function formatCountdown(totalSec: number): string {
		const hours = Math.floor(totalSec / 3600);
		const minutes = Math.floor((totalSec % 3600) / 60);
		const seconds = totalSec % 60;
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
	}

	$effect(() => {
		if (data.globalLeaderboard) {
			globalEntries = data.globalLeaderboard.items;
			hasMoreGlobal = data.globalLeaderboard.items.length === 50;
		}
	});

	function handleTabChange(tab: 'daily' | 'global') {
		const url = new URL(window.location.href);
		url.searchParams.set('tab', tab);
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleDateChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (!target.value) return;
		const url = new URL(window.location.href);
		url.searchParams.set('tab', 'daily');
		url.searchParams.set('date', target.value);
		goto(url.toString());
	}

	async function loadMoreGlobal() {
		if (isLoadingGlobal) return;
		isLoadingGlobal = true;
		globalError = null;
		try {
			const res = await fetch(`/api/leaderboard?limit=50&offset=${globalEntries.length}`);
			if (!res.ok) throw new Error(t('leaderboard.loadFailed'));
			const json = await res.json();
			const newEntries = json.items as LeaderboardEntryDto[];
			if (newEntries.length < 50) {
				hasMoreGlobal = false;
			}
			globalEntries = [...globalEntries, ...newEntries];
		} catch (e: unknown) {
			globalError = e instanceof Error ? e.message : t('leaderboard.loadFailed');
		} finally {
			isLoadingGlobal = false;
		}
	}
</script>

<svelte:head>
	<title>{t('leaderboard.title')}</title>
	<meta name="description" content={t('leaderboard.meta')} />
</svelte:head>

<section class="grid gap-8">
	<!-- Tab Navigation -->
	<div class="flex border-b-[3px] border-[var(--color-border)]">
		<button
			type="button"
			class="px-6 py-3 text-base font-black uppercase transition-colors
			{activeTab === 'daily'
				? 'border-b-4 border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-text)]'
				: 'text-[var(--color-muted)] hover:text-[var(--color-text)]'}"
			onclick={() => handleTabChange('daily')}
		>
			{t('leaderboard.tabDaily')}
		</button>
		<button
			type="button"
			class="px-6 py-3 text-base font-black uppercase transition-colors
			{activeTab === 'global'
				? 'border-b-4 border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-text)]'
				: 'text-[var(--color-muted)] hover:text-[var(--color-text)]'}"
			onclick={() => handleTabChange('global')}
		>
			{t('leaderboard.tabGlobal')}
		</button>
	</div>

	{#if activeTab === 'daily'}
		<!-- Daily Leaderboard View -->
		<header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<div class="flex flex-wrap items-center gap-2">
					<p class="page-kicker">{t('leaderboard.tabDaily')}</p>
					<Badge tone="accent">UTC {data.dailyLeaderboard.date}</Badge>
					<Badge tone="neutral">
						{t('leaderboard.participants', {
							count: data.dailyLeaderboard.totalParticipants
						})}
					</Badge>
				</div>
				<h1 class="page-title mt-1">{t('leaderboard.tabDaily')}</h1>
				<p class="mt-2 max-w-2xl text-base font-semibold text-[var(--color-muted)]">
					{t('leaderboard.dailyIntro')}
				</p>
			</div>

			<!-- Date selector and countdown -->
			<div class="flex flex-col gap-2 sm:items-end">
				{#if secondsLeft !== null}
					<div
						class="border-2 border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-1.5 text-right"
					>
						<span class="text-[10px] font-black text-[var(--color-muted)] uppercase">Resets In</span
						>
						<p class="font-mono text-base font-black text-[var(--color-text)]">
							{formatCountdown(secondsLeft)}
						</p>
					</div>
				{/if}

				<div class="flex items-center gap-2">
					<label
						for="daily-date-picker"
						class="text-xs font-black text-[var(--color-muted)] uppercase"
					>
						Date (UTC):
					</label>
					<input
						id="daily-date-picker"
						type="date"
						value={selectedDate}
						max={data.date}
						class="border-2 border-[var(--color-border)] bg-white px-2 py-1 text-sm font-bold"
						onchange={handleDateChange}
					/>
				</div>
			</div>
		</header>

		<Card title="{t('leaderboard.topReasoners')} — UTC {data.dailyLeaderboard.date}">
			<DailyLeaderboardTable
				entries={data.dailyLeaderboard.items}
				currentUserEntry={data.dailyLeaderboard.currentUserEntry}
				guestHypotheticalEntry={data.dailyLeaderboard.guestHypotheticalEntry}
			/>
		</Card>
	{:else}
		<!-- Global All-Time Leaderboard View -->
		{#if data.isGuest}
			<div
				class="border-[3px] border-[var(--color-border)] bg-amber-50 p-8 text-center shadow-[var(--shadow-hard-sm)]"
			>
				<h2 class="text-2xl font-black text-amber-950">Competitive Logic Rating</h2>
				<p class="mt-2 text-sm font-bold text-amber-800">
					Global All-Time rankings require an authenticated account.
				</p>
				<Button href="/auth/login" variant="primary" class="mt-4">
					{t('nav.login')}
				</Button>
			</div>
		{:else if data.globalLeaderboard}
			<header>
				<p class="page-kicker">{t('leaderboard.globalAllTime')}</p>
				<h1 class="page-title">{t('leaderboard.heading')}</h1>
				<p class="mt-3 max-w-2xl text-lg font-semibold text-[var(--color-muted)]">
					{t('leaderboard.intro')}
				</p>
			</header>

			<Card title={t('leaderboard.topReasoners')}>
				<LeaderboardTable
					entries={globalEntries}
					currentUserEntry={data.globalCurrentUserEntry}
					currentUserId={data.currentUserId ?? undefined}
				/>

				{#if hasMoreGlobal}
					<div class="mt-6 flex flex-col items-center gap-2">
						{#if globalError}
							<p class="text-sm font-bold text-red-600">{globalError}</p>
							<Button variant="secondary" onclick={loadMoreGlobal} disabled={isLoadingGlobal}>
								{isLoadingGlobal ? t('prep.loading') : t('common.tryAgain')}
							</Button>
						{:else}
							<Button variant="secondary" onclick={loadMoreGlobal} disabled={isLoadingGlobal}>
								{isLoadingGlobal ? t('prep.loading') : t('history.loadMore')}
							</Button>
						{/if}
					</div>
				{/if}
			</Card>
		{/if}
	{/if}
</section>
