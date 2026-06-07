<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import AdminTable from '$lib/components/admin/AdminTable.svelte';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import Button from '$lib/components/primitives/Button.svelte';
	import Card from '$lib/components/primitives/Card.svelte';
	import Input from '$lib/components/primitives/Input.svelte';

	type Props = {
		data: PageData;
		form?: ActionData;
	};

	let { data, form }: Props = $props();
</script>

<svelte:head>
	<title>Category Management | Tarkana</title>
</svelte:head>

<section class="grid gap-8">
	<header>
		<h1 class="page-title">Category Management</h1>
		<p class="mt-3 text-lg font-semibold text-[var(--color-muted)]">
			Inactive categories tidak dipakai oleh ChallengeBuilder.
		</p>
	</header>

	<Card title="New category">
		<form class="grid gap-4" method="POST" action="?/saveCategory">
			{#if form?.message}<p
					class="border-2 border-[var(--color-border)] bg-[var(--color-info)] p-3 font-bold"
				>
					{form.message}
				</p>{/if}
			<div class="grid gap-4 sm:grid-cols-2">
				<Input id="name" name="name" label="Name" required />
				<Input id="slug" name="slug" label="Slug" placeholder="number-sequence" required />
			</div>
			<label class="grid gap-2 text-sm font-black uppercase">
				Description
				<textarea
					class="min-h-24 border-[3px] border-[var(--color-border)] bg-white p-4 font-bold shadow-[var(--shadow-hard-sm)]"
					name="description"
				></textarea>
			</label>
			<label class="flex items-center gap-3 font-black">
				<input class="h-5 w-5" type="checkbox" name="isActive" checked />
				Active category
			</label>
			<Button type="submit">Save Category</Button>
		</form>
	</Card>

	<AdminTable title="Categories" description="Slug harus unik dan stabil untuk kontrak generator.">
		<table class="w-full min-w-[680px] border-collapse text-left">
			<thead class="bg-[var(--color-primary)]">
				<tr>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">Name</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">Slug</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">Status</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">Description</th>
				</tr>
			</thead>
			<tbody>
				{#each data.categories.items as category (category.id)}
					<tr class="border-b-2 border-[var(--color-border)] last:border-b-0">
						<td class="p-4 font-black">{category.name}</td>
						<td class="p-4 font-mono text-sm">{category.slug}</td>
						<td class="p-4"
							><Badge tone={category.isActive ? 'success' : 'danger'}
								>{category.isActive ? 'Active' : 'Inactive'}</Badge
							></td
						>
						<td class="p-4 font-semibold">{category.description ?? 'No description'}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</AdminTable>
</section>
