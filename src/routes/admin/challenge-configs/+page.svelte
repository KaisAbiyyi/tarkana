<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import AdminTable from '$lib/components/admin/AdminTable.svelte';
	import ChallengeConfigEditor from '$lib/components/admin/ChallengeConfigEditor.svelte';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import { labelChallengeType } from '$lib/shared/presentation/format';
	import { getI18nContext } from '$lib/i18n/context';

	type Props = {
		data: PageData;
		form?: ActionData;
	};

	let { data, form }: Props = $props();
	const { locale, t } = getI18nContext();
</script>

<svelte:head>
	<title>{t('admin.challengeConfigs')} | Tarkana</title>
	<meta name="description" content={t('admin.configMeta')} />
</svelte:head>

<section class="grid gap-8">
	<header>
		<h1 class="page-title">{t('admin.challengeConfigManagement')}</h1>
		<p class="mt-3 text-lg font-semibold text-[var(--color-muted)]">
			{t('admin.configIntro')}
		</p>
	</header>

	{#if form?.message}<p
			class="border-2 border-[var(--color-border)] bg-[var(--color-info)] p-3 font-bold"
		>
			{form.message}
		</p>{/if}
	<ChallengeConfigEditor />

	<AdminTable title={t('admin.challengeConfigs')}>
		<table class="w-full min-w-[820px] border-collapse text-left">
			<thead class="bg-[var(--color-primary)]">
				<tr>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">{t('admin.name')}</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">{t('admin.type')}</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">{t('admin.questions')}</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">{t('admin.status')}</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4"
						>{t('admin.difficultyDistribution')}</th
					>
				</tr>
			</thead>
			<tbody>
				{#each data.configs.items as config (config.id)}
					<tr class="border-b-2 border-[var(--color-border)] last:border-b-0">
						<td class="p-4 font-black">{config.name}</td>
						<td class="p-4 font-bold">{labelChallengeType(config.challengeType, locale)}</td>
						<td class="p-4 font-bold">{config.questionCount}</td>
						<td class="p-4"
							><Badge tone={config.isActive ? 'success' : 'danger'}
								>{config.isActive ? t('admin.active') : t('admin.inactive')}</Badge
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
