<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { setI18nContext } from '$lib/i18n/context';
	import { navigating } from '$app/stores';

	let { data, children } = $props();
	// svelte-ignore state_referenced_locally
	setI18nContext(data.locale);
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<!-- ponytail: ultra-simple loading bar instead of a heavy abstraction -->
{#if $navigating}
	<div class="fixed top-0 left-0 z-[9999] h-1.5 w-full overflow-hidden bg-transparent">
		<div class="h-full w-full bg-[var(--color-accent)] origin-left animate-pulse"></div>
	</div>
{/if}

{@render children()}
