<script lang="ts">
	import type { PageData } from './$types';
	import Card from '$lib/components/primitives/Card.svelte';
	import LeaderboardTable from '$lib/components/leaderboard/LeaderboardTable.svelte';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();
</script>

<svelte:head>
	<title>Leaderboard | Tarkana</title>
</svelte:head>

<section class="grid gap-8">
	<header>
		<p class="page-kicker">Global ranking</p>
		<h1 class="page-title">Leaderboard</h1>
		<p class="mt-3 max-w-2xl text-lg font-semibold text-[var(--color-muted)]">
			Ranking berdasarkan Logic Rating. Email tidak ditampilkan dan suspicious session dikecualikan
			dari perhitungan server-side.
		</p>
	</header>

	<Card title="Top Reasoners">
		<LeaderboardTable entries={data.leaderboard.items} />
	</Card>
</section>
