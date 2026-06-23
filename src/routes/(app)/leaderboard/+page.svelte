<script lang="ts">
	import type { PageData } from './$types';
	import Card from '$lib/components/primitives/Card.svelte';
	import LeaderboardTable from '$lib/components/leaderboard/LeaderboardTable.svelte';

	import Button from '$lib/components/primitives/Button.svelte';
	import type { LeaderboardEntryDto } from '$lib/shared/types/leaderboard';
	import { getI18nContext } from '$lib/i18n/context';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();
	const { t } = getI18nContext();

	let entries = $state<LeaderboardEntryDto[]>([]);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let hasMore = $state(false);

	$effect(() => {
		entries = data.leaderboard.items;
		hasMore = data.leaderboard.items.length === 50;
	});

	async function loadMore() {
		if (isLoading) return;
		isLoading = true;
		error = null;
		try {
			const res = await fetch(`/api/leaderboard?limit=50&offset=${entries.length}`);
			if (!res.ok) throw new Error(t('leaderboard.loadFailed'));
			const json = await res.json();
			const newEntries = json.items as LeaderboardEntryDto[];
			if (newEntries.length < 50) {
				hasMore = false;
			}
			entries = [...entries, ...newEntries];
		} catch (e: unknown) {
			if (e instanceof Error) {
				error = e.message;
			} else {
				error = t('leaderboard.loadFailed');
			}
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>{t('leaderboard.title')}</title>
	<meta name="description" content={t('leaderboard.meta')} />
</svelte:head>

<section class="grid gap-8">
	<header>
		<p class="page-kicker">{t('leaderboard.globalAllTime')}</p>
		<h1 class="page-title">{t('leaderboard.heading')}</h1>
		<p class="mt-3 max-w-2xl text-lg font-semibold text-[var(--color-muted)]">
			{t('leaderboard.intro')}
		</p>
	</header>

	<Card title={t('leaderboard.topReasoners')}>
		<LeaderboardTable
			{entries}
			currentUserEntry={data.currentUserEntry}
			currentUserId={data.currentUserId}
		/>

		{#if hasMore}
			<div class="mt-6 flex flex-col items-center gap-2">
				{#if error}
					<p class="text-sm font-bold text-red-600">{error}</p>
					<Button variant="secondary" onclick={loadMore} disabled={isLoading}>
						{isLoading ? t('prep.loading') : t('common.tryAgain')}
					</Button>
				{:else}
					<Button variant="secondary" onclick={loadMore} disabled={isLoading}>
						{isLoading ? t('prep.loading') : t('history.loadMore')}
					</Button>
				{/if}
			</div>
		{/if}
	</Card>
</section>
