<script lang="ts">
	import { page } from '$app/state';
	import AppErrorState from '$lib/components/app/AppErrorState.svelte';
	import { getI18nContext } from '$lib/i18n/context';

	const { t } = getI18nContext();
	const fallbackMessage = t('error.fallback');

	let status = $derived(page.status);
	let message = $derived(page.error?.message || fallbackMessage);
</script>

<AppErrorState {message} {status} />
