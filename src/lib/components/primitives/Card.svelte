<script lang="ts">
	import type { Snippet } from 'svelte';

	type CardTone = 'default' | 'accent' | 'warning' | 'danger';

	type Props = {
		children?: Snippet;
		title?: string;
		description?: string;
		tone?: CardTone;
		class?: string;
	};

	let { children, title, description, tone = 'default', class: className = '' }: Props = $props();

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
			{#if title}<h2 class="text-xl font-black">{title}</h2>{/if}
			{#if description}<p class="text-sm font-semibold opacity-80">{description}</p>{/if}
		</header>
	{/if}
	{@render children?.()}
</section>
