<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import AdminTable from '$lib/components/admin/AdminTable.svelte';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import Button from '$lib/components/primitives/Button.svelte';
	import Card from '$lib/components/primitives/Card.svelte';
	import Input from '$lib/components/primitives/Input.svelte';
	import { getI18nContext } from '$lib/i18n/context';

	type Props = {
		data: PageData;
		form?: ActionData;
	};

	let { data, form }: Props = $props();
	const { t } = getI18nContext();
</script>

<svelte:head>
	<title>{t('admin.categoryManagement')} | Tarkana</title>
	<meta name="description" content={t('admin.categoryMeta')} />
</svelte:head>

<section class="grid gap-8">
	<header>
		<h1 class="page-title">{t('admin.categoryManagement')}</h1>
		<p class="mt-3 text-lg font-semibold text-[var(--color-muted)]">
			{t('admin.categoryIntro')}
		</p>
	</header>

	<Card title={t('admin.newCategory')}>
		<form class="grid gap-4" method="POST" action="?/saveCategory">
			{#if form?.message}<p
					class="border-2 border-[var(--color-border)] bg-[var(--color-info)] p-3 font-bold"
				>
					{form.message}
				</p>{/if}
			<div class="grid gap-4 sm:grid-cols-2">
				<Input id="name" name="name" label={t('admin.name')} required />
				<Input
					id="slug"
					name="slug"
					label={t('admin.slug')}
					placeholder="number-sequence"
					required
				/>
			</div>
			<label class="grid gap-2 text-sm font-black uppercase">
				{t('admin.description')}
				<textarea
					class="min-h-24 border-[3px] border-[var(--color-border)] bg-white p-4 font-bold shadow-[var(--shadow-hard-sm)]"
					name="description"
				></textarea>
			</label>
			<label class="flex items-center gap-3 font-black">
				<input class="h-5 w-5" type="checkbox" name="isActive" checked />
				{t('admin.activeCategory')}
			</label>
			<Button type="submit">{t('admin.saveCategory')}</Button>
		</form>
	</Card>

	<AdminTable title={t('admin.categories')} description={t('admin.categoryContract')}>
		<table class="w-full min-w-[680px] border-collapse text-left">
			<thead class="bg-[var(--color-primary)]">
				<tr>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">{t('admin.name')}</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">{t('admin.slug')}</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">{t('admin.status')}</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">{t('admin.description')}</th>
				</tr>
			</thead>
			<tbody>
				{#each data.categories.items as category (category.id)}
					<tr class="border-b-2 border-[var(--color-border)] last:border-b-0">
						<td class="p-4 font-black">{category.name}</td>
						<td class="p-4 font-mono text-sm">{category.slug}</td>
						<td class="p-4"
							><Badge tone={category.isActive ? 'success' : 'danger'}
								>{category.isActive ? t('admin.active') : t('admin.inactive')}</Badge
							></td
						>
						<td class="p-4 font-semibold">{category.description ?? t('admin.noDescription')}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</AdminTable>
</section>
