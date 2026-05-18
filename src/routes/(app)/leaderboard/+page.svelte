<script lang="ts">
	import type { PageData } from './$types';
	import Card from '$lib/components/primitives/Card.svelte';
	import LeaderboardTable from '$lib/components/leaderboard/LeaderboardTable.svelte';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();
</script>

<section class="grid gap-8">
	<header>
		<p class="font-black text-[var(--color-muted)] uppercase">Global ranking</p>
		<h1 class="text-4xl font-black sm:text-5xl">Leaderboard</h1>
		<p class="mt-2 max-w-2xl font-semibold text-[var(--color-muted)]">
			Ranking berdasarkan Logic Rating. Email tidak ditampilkan dan suspicious session dikecualikan
			dari perhitungan server-side.
		</p>
	</header>

	<Card title="Top Reasoners">
		<LeaderboardTable entries={data.leaderboard.items} />
	</Card>
</section>
