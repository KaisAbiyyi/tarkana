<script lang="ts">
	import type { DashboardRecentSessionDto } from '$lib/shared/types/dashboard';
	import {
		formatDateTime,
		formatPercent,
		labelChallengeType
	} from '$lib/shared/presentation/format';
	import Badge from '$lib/components/primitives/Badge.svelte';

	type Props = {
		sessions: DashboardRecentSessionDto[];
	};

	let { sessions }: Props = $props();
</script>

{#if sessions.length === 0}
	<div class="border-2 border-dashed border-[var(--color-border)] bg-[var(--color-paper)] p-5">
		<p class="font-black">Belum ada session.</p>
		<p class="text-sm font-semibold text-[var(--color-muted)]">
			Mulai challenge pertama untuk mengisi history dan Rank Progress.
		</p>
	</div>
{:else}
	<ul class="grid gap-3">
		{#each sessions as session (session.id)}
			<li
				class="flex flex-wrap items-center justify-between gap-3 border-2 border-[var(--color-border)] bg-white p-4"
			>
				<div>
					<p class="font-black">{labelChallengeType(session.challengeType)}</p>
					<p class="text-sm font-semibold text-[var(--color-muted)]">
						{formatDateTime(session.createdAt)}
					</p>
				</div>
				<div class="flex items-center gap-2">
					<Badge tone="warning">{session.totalScore} pts</Badge>
					<Badge tone="accent">{formatPercent(session.accuracy)}</Badge>
				</div>
			</li>
		{/each}
	</ul>
{/if}
