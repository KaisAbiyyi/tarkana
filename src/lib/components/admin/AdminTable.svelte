<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		description?: string;
		children?: Snippet;
	};

	let { title, description, children }: Props = $props();
</script>

<section
	class="overflow-x-auto border-[3px] border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-hard)]"
>
	<header class="mb-4">
		<h2 class="text-2xl font-black">{title}</h2>
		{#if description}<p class="font-semibold text-[var(--color-muted)]">{description}</p>{/if}
	</header>
	{@render children?.()}
</section>
