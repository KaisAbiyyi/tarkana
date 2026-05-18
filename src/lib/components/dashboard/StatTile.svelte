<script lang="ts">
	type Props = {
		label: string;
		value: string | number;
		helper?: string;
		tone?: 'white' | 'yellow' | 'teal';
	};

	let { label, value, helper, tone = 'white' }: Props = $props();

	const toneClass = {
		white: 'bg-white',
		yellow: 'bg-[var(--color-primary)]',
		teal: 'bg-[var(--color-accent)]'
	};
</script>

<article
	class={`border-[3px] border-[var(--color-border)] p-5 shadow-[var(--shadow-hard-sm)] ${toneClass[tone]}`}
>
	<p class="text-sm font-black uppercase">{label}</p>
	<p class="mt-2 text-3xl font-black">{value}</p>
	{#if helper}<p class="mt-1 text-sm font-bold text-[var(--color-muted)]">{helper}</p>{/if}
</article>
