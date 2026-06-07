<script lang="ts">
	import type { LeaderboardEntryDto } from '$lib/shared/types/leaderboard';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import { formatPercent } from '$lib/shared/presentation/format';

	type Props = {
		entries: LeaderboardEntryDto[];
	};

	let { entries }: Props = $props();
</script>

{#if entries.length === 0}
	<div class="border-2 border-dashed border-[var(--color-border)] bg-white p-5">
		<p class="font-black">Leaderboard belum punya data.</p>
		<p class="text-sm font-semibold text-[var(--color-muted)]">
			Session suspicious tidak dihitung, dan email tidak ditampilkan.
		</p>
	</div>
{:else}
	<div class="grid gap-3 md:hidden">
		{#each entries as entry (entry.position)}
			<article
				class="border-[3px] border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-hard-sm)]"
			>
				<div class="flex items-start justify-between gap-3">
					<div>
						<p class="text-sm font-black text-[var(--color-muted)] uppercase">
							Rank #{entry.position}
						</p>
						<h3 class="text-xl font-black">{entry.displayName}</h3>
					</div>
					<Badge tone="accent">{entry.rank}</Badge>
				</div>
				<dl class="mt-4 grid grid-cols-3 gap-2 text-sm">
					<div class="border-2 border-[var(--color-border)] bg-[var(--color-primary)] p-2">
						<dt class="font-black uppercase">Rating</dt>
						<dd class="font-black">{entry.logicRating}</dd>
					</div>
					<div class="border-2 border-[var(--color-border)] bg-[var(--color-accent)] p-2">
						<dt class="font-black uppercase">Accuracy</dt>
						<dd class="font-black">{formatPercent(entry.averageAccuracy)}</dd>
					</div>
					<div class="border-2 border-[var(--color-border)] bg-white p-2">
						<dt class="font-black uppercase">Done</dt>
						<dd class="font-black">{entry.totalCompleted}</dd>
					</div>
				</dl>
			</article>
		{/each}
	</div>
	<div
		class="hidden overflow-x-auto border-[3px] border-[var(--color-border)] bg-white shadow-[var(--shadow-hard)] md:block"
	>
		<table class="w-full min-w-[720px] border-collapse text-left">
			<thead class="bg-[var(--color-primary)]">
				<tr>
					<th class="border-b-[3px] border-[var(--color-border)] p-4 font-black">#</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4 font-black">Display name</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4 font-black">Rank</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4 font-black">Logic Rating</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4 font-black"
						>Challenge Accuracy</th
					>
					<th class="border-b-[3px] border-[var(--color-border)] p-4 font-black">Completed</th>
				</tr>
			</thead>
			<tbody>
				{#each entries as entry (entry.position)}
					<tr class="border-b-2 border-[var(--color-border)] last:border-b-0">
						<td class="p-4 font-black">{entry.position}</td>
						<td class="p-4 font-black">{entry.displayName}</td>
						<td class="p-4"><Badge tone="accent">{entry.rank}</Badge></td>
						<td class="p-4 font-bold">{entry.logicRating}</td>
						<td class="p-4 font-bold">{formatPercent(entry.averageAccuracy)}</td>
						<td class="p-4 font-bold">{entry.totalCompleted}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
