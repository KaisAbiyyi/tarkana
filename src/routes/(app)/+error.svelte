<script lang="ts">
	import { page } from '$app/state';
	import AppErrorState from '$lib/components/app/AppErrorState.svelte';

	const fallbackMessage = 'We could not open this page. Try again from a valid Tarkana flow.';

	let status = $derived(page.status);
	let message = $derived(page.error?.message || fallbackMessage);
</script>

<AppErrorState {message} {status} />
