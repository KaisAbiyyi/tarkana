<script lang="ts">
	import type { Snippet } from 'svelte';

	type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

	type Props = {
		children?: Snippet;
		tone?: BadgeTone;
		class?: string;
	};

	let { children, tone = 'neutral', class: className = '' }: Props = $props();

	const toneClass: Record<BadgeTone, string> = {
		neutral: 'bg-white',
		accent: 'bg-[var(--color-accent)]',
		success: 'bg-[var(--color-success)]',
		warning: 'bg-[var(--color-primary)]',
		danger: 'bg-[var(--color-danger)] text-white'
	};
</script>

<span
	class={`inline-flex items-center border-2 border-[var(--color-border)] px-2.5 py-1 text-xs font-black uppercase ${toneClass[tone]} ${className}`}
>
	{@render children?.()}
</span>
