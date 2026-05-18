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
	<div
		class="overflow-x-auto border-[3px] border-[var(--color-border)] bg-white shadow-[var(--shadow-hard)]"
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
