<script lang="ts">
	import type { Snippet } from 'svelte';
	import Card from '$lib/components/primitives/Card.svelte';

	type Props = {
		title: string;
		description: string;
		children?: Snippet;
	};

	let { title, description, children }: Props = $props();
</script>

<Card class="w-full" {title} headingLevel="h1" {description}>
	{@render children?.()}
</Card>
