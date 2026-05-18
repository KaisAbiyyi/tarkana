<script lang="ts">
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/primitives/Button.svelte';
	import Card from '$lib/components/primitives/Card.svelte';
	import ProgressBar from '$lib/components/primitives/ProgressBar.svelte';
	import RecentSessions from '$lib/components/dashboard/RecentSessions.svelte';
	import StatTile from '$lib/components/dashboard/StatTile.svelte';
	import { formatPercent, formatSeconds } from '$lib/shared/presentation/format';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();
	let stats = $derived(data.stats);
</script>

<section class="grid gap-8">
	<header class="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
		<div>
			<p class="font-black text-[var(--color-muted)] uppercase">Dashboard</p>
			<h1 class="text-4xl font-black sm:text-5xl">Logic Rating {stats.logicRating}</h1>
			<p class="mt-2 max-w-2xl font-semibold text-[var(--color-muted)]">
				Rank, Challenge Accuracy, dan Category Mastery hanya berasal dari session yang selesai.
			</p>
		</div>
		<Button href="/challenge" size="lg">Start Challenge</Button>
	</header>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<StatTile label="Current Rank" value={stats.currentRank} tone="yellow" />
		<StatTile label="Completed" value={stats.totalCompleted} helper="valid sessions" />
		<StatTile label="Best Score" value={stats.bestScore} tone="teal" />
		<StatTile label="Average Accuracy" value={formatPercent(stats.averageAccuracy)} />
	</div>

	<div class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
		<Card title="Rank Progress" description="Progress menuju tier berikutnya.">
			<ProgressBar value={stats.logicRating % 500} max={500} label="Rank Progress" tone="accent" />
			<p class="mt-4 text-sm font-bold text-[var(--color-muted)]">
				Average solve time: {formatSeconds(stats.averageSolveTimeSeconds)}
			</p>
		</Card>

		<Card title="Mode Selection" description="Pilih mode di halaman challenge.">
			<div class="grid gap-3 sm:grid-cols-2">
				<a
					class="border-2 border-[var(--color-border)] bg-white p-4 font-black no-underline hover:bg-[var(--color-primary)]"
					href={resolve('/challenge?mode=number_sequence')}>Number Sequence</a
				>
				<a
					class="border-2 border-[var(--color-border)] bg-white p-4 font-black no-underline hover:bg-[var(--color-primary)]"
					href={resolve('/challenge?mode=symbol_pattern')}>Symbol Pattern</a
				>
				<a
					class="border-2 border-[var(--color-border)] bg-white p-4 font-black no-underline hover:bg-[var(--color-primary)]"
					href={resolve('/challenge?mode=mini_deduction')}>Mini Deduction</a
				>
				<a
					class="border-2 border-[var(--color-border)] bg-white p-4 font-black no-underline hover:bg-[var(--color-primary)]"
					href={resolve('/challenge?mode=memory_pattern')}>Memory Pattern</a
				>
			</div>
		</Card>
	</div>

	<div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
		<Card title="Recent Sessions">
			<RecentSessions sessions={stats.recentSessions} />
		</Card>

		<Card title="Category Mastery">
			<div class="grid gap-3">
				<StatTile label="Strongest Category" value={stats.strongestCategory ?? 'Not enough data'} />
				<StatTile label="Weakest Category" value={stats.weakestCategory ?? 'Not enough data'} />
			</div>
		</Card>
	</div>
</section>
