<script lang="ts">
	import type { PageData } from './$types';
	import FirstRunDashboard from '$lib/components/dashboard/FirstRunDashboard.svelte';
	import ActiveDashboard from '$lib/components/dashboard/ActiveDashboard.svelte';
	import { getI18nContext } from '$lib/i18n/context';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();
	const { t } = getI18nContext();
	let stats = $derived(data.stats);

	// Define first run as having no completed sessions
	let isFirstRun = $derived(stats.totalCompleted === 0);
</script>

<svelte:head>
	<title>{t('dashboard.title')}</title>
	<meta name="description" content={t('dashboard.meta')} />
</svelte:head>

{#if isFirstRun}
	<FirstRunDashboard />
{:else}
	<ActiveDashboard {stats} />
{/if}
