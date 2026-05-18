<script lang="ts">
	import type { PageData } from './$types';
	import AdminTable from '$lib/components/admin/AdminTable.svelte';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import {
		formatDateTime,
		formatPercent,
		labelChallengeType,
		labelSessionStatus
	} from '$lib/shared/presentation/format';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();
</script>

<section class="grid gap-8">
	<header>
		<h1 class="text-4xl font-black sm:text-5xl">Session Monitoring</h1>
		<p class="mt-2 font-semibold text-[var(--color-muted)]">
			Monitoring operasional web-only. Leaderboard tetap tidak menampilkan email.
		</p>
	</header>

	<AdminTable title="Recent Sessions">
		<table class="w-full min-w-[900px] border-collapse text-left">
			<thead class="bg-[var(--color-primary)]">
				<tr>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">Session</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">Display name</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">Type</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">Score</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">Accuracy</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">Status</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">Created</th>
				</tr>
			</thead>
			<tbody>
				{#each data.sessions.items as session (session.id)}
					<tr class="border-b-2 border-[var(--color-border)] last:border-b-0">
						<td class="p-4 font-mono text-xs">{session.id}</td>
						<td class="p-4 font-black">{session.displayName}</td>
						<td class="p-4 font-bold">{labelChallengeType(session.challengeType)}</td>
						<td class="p-4 font-bold">{session.totalScore}</td>
						<td class="p-4 font-bold">{formatPercent(session.accuracy)}</td>
						<td class="p-4">
							<Badge tone={session.isSuspicious ? 'danger' : 'accent'}>
								{session.isSuspicious ? 'Suspicious' : labelSessionStatus(session.status)}
							</Badge>
						</td>
						<td class="p-4 font-semibold">{formatDateTime(session.createdAt)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</AdminTable>
</section>
