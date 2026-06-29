<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.png';
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
		<div class="h-full w-full origin-left animate-pulse bg-[var(--color-accent)]"></div>
	</div>
{/if}

{@render children()}
