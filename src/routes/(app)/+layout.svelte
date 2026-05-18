<script lang="ts">
	import type { LayoutData } from './$types';
	import AppShell from '$lib/components/app/AppShell.svelte';

	type Props = {
		data: LayoutData;
		children?: import('svelte').Snippet;
	};

	let { data, children }: Props = $props();
</script>

<AppShell profile={data.profile}>
	{@render children?.()}
</AppShell>
