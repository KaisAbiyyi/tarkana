<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import AdminTable from '$lib/components/admin/AdminTable.svelte';
	import RuleEditor from '$lib/components/admin/RuleEditor.svelte';
	import Badge from '$lib/components/primitives/Badge.svelte';

	type Props = {
		data: PageData;
		form?: ActionData;
	};

	let { data, form }: Props = $props();
	let categoryById = $derived(
		new Map(data.categories.items.map((category) => [category.id, category.name]))
	);
</script>

<section class="grid gap-8">
	<header>
		<h1 class="text-4xl font-black sm:text-5xl">Question Rule Management</h1>
		<p class="mt-2 font-semibold text-[var(--color-muted)]">
			Rule aktif harus punya difficulty range valid, time limit, dan config JSON yang bisa
			divalidasi.
		</p>
	</header>

	<RuleEditor categories={data.categories.items} message={form?.message} />

	<AdminTable title="Question Rules">
		<table class="w-full min-w-[820px] border-collapse text-left">
			<thead class="bg-[var(--color-primary)]">
				<tr>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">Category</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">Rule type</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">Difficulty</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">Time limit</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">Status</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">Config</th>
				</tr>
			</thead>
			<tbody>
				{#each data.rules.items as rule (rule.id)}
					<tr class="border-b-2 border-[var(--color-border)] last:border-b-0">
						<td class="p-4 font-black">{categoryById.get(rule.categoryId) ?? 'Unknown category'}</td
						>
						<td class="p-4 font-mono text-sm">{rule.ruleType}</td>
						<td class="p-4 font-bold">{rule.difficultyMin}-{rule.difficultyMax}</td>
						<td class="p-4 font-bold">{rule.timeLimitSeconds}s</td>
						<td class="p-4"
							><Badge tone={rule.isActive ? 'success' : 'danger'}
								>{rule.isActive ? 'Active' : 'Inactive'}</Badge
							></td
						>
						<td class="max-w-[280px] truncate p-4 font-mono text-xs"
							>{JSON.stringify(rule.config)}</td
						>
					</tr>
				{/each}
			</tbody>
		</table>
	</AdminTable>
</section>
