<script lang="ts">
	type Props = {
		metadata: Record<string, unknown>;
		visible: boolean;
	};

	let { metadata, visible }: Props = $props();
	let sequence = $derived(Array.isArray(metadata.memorize) ? metadata.memorize.map(String) : []);
</script>

{#if sequence.length > 0}
	<div
		class="border-[3px] border-[var(--color-border)] bg-[var(--color-primary)] p-4 shadow-[var(--shadow-hard-sm)]"
	>
		<p class="text-sm font-black uppercase">{visible ? 'Memorize now' : 'Pattern hidden'}</p>
		{#if visible}
			<div class="mt-3 flex flex-wrap gap-2">
				{#each sequence as item, index (`${item}-${index}`)}
					<span class="border-2 border-[var(--color-border)] bg-white px-4 py-3 font-black"
						>{item}</span
					>
				{/each}
			</div>
		{:else}
			<p class="mt-3 font-bold">Jawab dari ingatan kamu. Pola tidak ditampilkan lagi.</p>
		{/if}
	</div>
{/if}
