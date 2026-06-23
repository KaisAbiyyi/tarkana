<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { setI18nContext } from '$lib/i18n/context';

	let { data, children } = $props();
	// svelte-ignore state_referenced_locally
	setI18nContext(data.locale);
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
