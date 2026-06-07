<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import AdminTable from '$lib/components/admin/AdminTable.svelte';
	import ChallengeConfigEditor from '$lib/components/admin/ChallengeConfigEditor.svelte';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import { labelChallengeType } from '$lib/shared/presentation/format';

	type Props = {
		data: PageData;
		form?: ActionData;
	};

	let { data, form }: Props = $props();
</script>

<svelte:head>
	<title>Challenge Configs | Tarkana</title>
</svelte:head>

<section class="grid gap-8">
	<header>
		<h1 class="page-title">Challenge Config Management</h1>
		<p class="mt-3 text-lg font-semibold text-[var(--color-muted)]">
			Jumlah soal dan distribusi mode/difficulty dikonfigurasi di sini, bukan hardcoded di UI.
		</p>
	</header>

	{#if form?.message}<p
			class="border-2 border-[var(--color-border)] bg-[var(--color-info)] p-3 font-bold"
		>
			{form.message}
		</p>{/if}
	<ChallengeConfigEditor />

	<AdminTable title="Challenge Configs">
		<table class="w-full min-w-[820px] border-collapse text-left">
			<thead class="bg-[var(--color-primary)]">
				<tr>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">Name</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">Type</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">Questions</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">Status</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">Difficulty distribution</th>
				</tr>
			</thead>
			<tbody>
				{#each data.configs.items as config (config.id)}
					<tr class="border-b-2 border-[var(--color-border)] last:border-b-0">
						<td class="p-4 font-black">{config.name}</td>
						<td class="p-4 font-bold">{labelChallengeType(config.challengeType)}</td>
						<td class="p-4 font-bold">{config.questionCount}</td>
						<td class="p-4"
							><Badge tone={config.isActive ? 'success' : 'danger'}
								>{config.isActive ? 'Active' : 'Inactive'}</Badge
							></td
						>
						<td class="max-w-[320px] truncate p-4 font-mono text-xs"
							>{JSON.stringify(config.difficultyDistribution ?? {})}</td
						>
					</tr>
				{/each}
			</tbody>
		</table>
	</AdminTable>
</section>
