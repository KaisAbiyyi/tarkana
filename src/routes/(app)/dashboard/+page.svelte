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
	let progressValue = $derived(stats.logicRating % 500);
</script>

<svelte:head>
	<title>Dashboard | Tarkana</title>
</svelte:head>

<section class="grid gap-8">
	<header class="ink-panel grid gap-6 bg-white p-5 md:p-7 lg:grid-cols-[1fr_360px] lg:items-center">
		<div class="space-y-4">
			<p class="page-kicker">Dashboard</p>
			<h1 class="page-title">Logic Rating {stats.logicRating}</h1>
			<p class="max-w-2xl text-lg font-semibold text-[var(--color-muted)]">
				Rank, Challenge Accuracy, dan Category Mastery hanya berasal dari session yang selesai.
				Pilih mode, jawab cepat, dan biarkan server menghitung hasilnya.
			</p>
			<div class="grid max-w-2xl gap-3 sm:grid-cols-3">
				<div class="border-[3px] border-[var(--color-border)] bg-[var(--color-primary)] p-4">
					<p class="text-xs font-black uppercase">Current Rank</p>
					<p class="text-2xl font-black">{stats.currentRank}</p>
				</div>
				<div class="border-[3px] border-[var(--color-border)] bg-[var(--color-accent)] p-4">
					<p class="text-xs font-black uppercase">Completed</p>
					<p class="text-2xl font-black">{stats.totalCompleted}</p>
				</div>
				<div class="border-[3px] border-[var(--color-border)] bg-white p-4">
					<p class="text-xs font-black uppercase">Best Score</p>
					<p class="text-2xl font-black">{stats.bestScore}</p>
				</div>
			</div>
		</div>
		<div class="border-[3px] border-[var(--color-border)] bg-[var(--color-paper)] p-5">
			<p class="text-sm font-black uppercase">Next arena run</p>
			<p class="mt-2 text-3xl font-black">Start a timed challenge</p>
			<p class="mt-2 text-sm font-bold text-[var(--color-muted)]">
				Average solve time: {formatSeconds(stats.averageSolveTimeSeconds)}
			</p>
			<Button href="/challenge" size="lg" class="mt-5 w-full">Start Challenge</Button>
		</div>
	</header>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<StatTile label="Average Accuracy" value={formatPercent(stats.averageAccuracy)} tone="lime" />
		<StatTile
			label="Average Time"
			value={formatSeconds(stats.averageSolveTimeSeconds)}
			helper="per answered question"
		/>
		<StatTile label="Strongest" value={stats.strongestCategory ?? 'Not enough data'} tone="teal" />
		<StatTile label="Weakest" value={stats.weakestCategory ?? 'Not enough data'} tone="blue" />
	</div>

	<div class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
		<Card title="Rank Progress" description="Progress menuju tier berikutnya.">
			<ProgressBar value={progressValue} max={500} label="Rank Progress" tone="accent" />
			<p class="mt-4 text-sm font-bold text-[var(--color-muted)]">
				{500 - progressValue} rating points menuju tier berikutnya.
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
