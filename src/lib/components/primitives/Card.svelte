<script lang="ts">
	import type { Snippet } from 'svelte';

	type CardTone = 'default' | 'accent' | 'warning' | 'danger';

	type Props = {
		children?: Snippet;
		title?: string;
		description?: string;
		headingLevel?: 'h1' | 'h2' | 'h3';
		tone?: CardTone;
		class?: string;
	};

	let {
		children,
		title,
		description,
		headingLevel = 'h2',
		tone = 'default',
		class: className = ''
	}: Props = $props();

	const toneClass: Record<CardTone, string> = {
		default: 'bg-white',
		accent: 'bg-[var(--color-accent)]',
		warning: 'bg-[var(--color-primary)]',
		danger: 'bg-[var(--color-danger)] text-white'
	};
</script>

<section
	class={`border-[3px] border-[var(--color-border)] ${toneClass[tone]} p-5 shadow-[var(--shadow-hard)] ${className}`}
>
	{#if title || description}
		<header class="mb-4 space-y-1">
			{#if title}<svelte:element this={headingLevel} class="text-xl font-black"
					>{title}</svelte:element
				>{/if}
			{#if description}<p class="text-sm font-semibold opacity-80">{description}</p>{/if}
		</header>
	{/if}
	{@render children?.()}
</section>
