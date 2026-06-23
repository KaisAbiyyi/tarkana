<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import AdminTable from '$lib/components/admin/AdminTable.svelte';
	import RuleEditor from '$lib/components/admin/RuleEditor.svelte';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import { getI18nContext } from '$lib/i18n/context';

	type Props = {
		data: PageData;
		form?: ActionData;
	};

	let { data, form }: Props = $props();
	const { t } = getI18nContext();
	let categoryById = $derived(
		new Map(data.categories.items.map((category) => [category.id, category.name]))
	);
</script>

<svelte:head>
	<title>{t('admin.questionRules')} | Tarkana</title>
	<meta name="description" content={t('admin.ruleMeta')} />
</svelte:head>

<section class="grid gap-8">
	<header>
		<h1 class="page-title">{t('admin.ruleManagement')}</h1>
		<p class="mt-3 text-lg font-semibold text-[var(--color-muted)]">
			{t('admin.ruleIntro')}
		</p>
	</header>

	<RuleEditor categories={data.categories.items} message={form?.message} />

	<AdminTable title={t('admin.questionRules')}>
		<table class="w-full min-w-[820px] border-collapse text-left">
			<thead class="bg-[var(--color-primary)]">
				<tr>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">{t('admin.category')}</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">{t('admin.ruleType')}</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">{t('admin.difficulty')}</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">{t('admin.timeLimit')}</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">{t('admin.status')}</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">{t('admin.configs')}</th>
				</tr>
			</thead>
			<tbody>
				{#each data.rules.items as rule (rule.id)}
					<tr class="border-b-2 border-[var(--color-border)] last:border-b-0">
						<td class="p-4 font-black"
							>{categoryById.get(rule.categoryId) ?? t('admin.unknownCategory')}</td
						>
						<td class="p-4 font-mono text-sm">{rule.ruleType}</td>
						<td class="p-4 font-bold">{rule.difficultyMin}-{rule.difficultyMax}</td>
						<td class="p-4 font-bold">{rule.timeLimitSeconds}s</td>
						<td class="p-4"
							><Badge tone={rule.isActive ? 'success' : 'danger'}
								>{rule.isActive ? t('admin.active') : t('admin.inactive')}</Badge
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
