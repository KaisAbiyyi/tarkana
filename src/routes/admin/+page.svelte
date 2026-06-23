<script lang="ts">
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import Card from '$lib/components/primitives/Card.svelte';
	import StatTile from '$lib/components/dashboard/StatTile.svelte';
	import { getI18nContext } from '$lib/i18n/context';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();
	const { t } = getI18nContext();
	let overview = $derived(data.overview);
</script>

<svelte:head>
	<title>{t('admin.overviewTitle')}</title>
	<meta name="description" content={t('admin.overviewMeta')} />
</svelte:head>

<section class="grid gap-8">
	<header>
		<p class="page-kicker">{t('admin.webOnly')}</p>
		<h1 class="page-title">{t('admin.overview')}</h1>
		<p class="mt-3 max-w-2xl text-lg font-semibold text-[var(--color-muted)]">
			{t('admin.overviewIntro')}
		</p>
	</header>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
		<StatTile label={t('admin.categories')} value={overview.categoryCount} tone="yellow" />
		<StatTile label={t('admin.activeRules')} value={overview.activeRuleCount} tone="teal" />
		<StatTile label={t('admin.configs')} value={overview.challengeConfigCount} />
		<StatTile label={t('admin.suspicious')} value={overview.suspiciousSessionCount} />
		<StatTile label={t('admin.users')} value={overview.userCount} />
	</div>

	<Card title={t('admin.modules')}>
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<a
				class="border-2 border-[var(--color-border)] bg-white p-4 font-black no-underline hover:bg-[var(--color-primary)]"
				href={resolve('/admin/categories')}>{t('admin.categories')}</a
			>
			<a
				class="border-2 border-[var(--color-border)] bg-white p-4 font-black no-underline hover:bg-[var(--color-primary)]"
				href={resolve('/admin/question-rules')}>{t('admin.questionRules')}</a
			>
			<a
				class="border-2 border-[var(--color-border)] bg-white p-4 font-black no-underline hover:bg-[var(--color-primary)]"
				href={resolve('/admin/challenge-configs')}>{t('admin.challengeConfigs')}</a
			>
			<a
				class="border-2 border-[var(--color-border)] bg-white p-4 font-black no-underline hover:bg-[var(--color-primary)]"
				href={resolve('/admin/sessions')}>{t('admin.sessionMonitoring')}</a
			>
		</div>
	</Card>
</section>
