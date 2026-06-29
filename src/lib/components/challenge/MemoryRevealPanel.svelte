<script lang="ts">
	import { getI18nContext } from '$lib/i18n/context';
	import SymbolGlyph from '$lib/components/challenge/SymbolGlyph.svelte';
	import { labelSymbolToken } from '$lib/shared/presentation/symbols';
	type Props = {
		metadata: Record<string, unknown>;
		visible: boolean;
	};

	let { metadata, visible }: Props = $props();
	const { locale, t } = getI18nContext();
	let sequence = $derived(Array.isArray(metadata.memorize) ? metadata.memorize.map(String) : []);
</script>

{#if sequence.length > 0}
	<div
		class="border-[3px] border-[var(--color-border)] bg-[var(--color-primary)] p-4 shadow-[var(--shadow-hard-sm)]"
	>
		<p class="text-sm font-black uppercase">
			{visible ? t('arena.memoryNow') : t('arena.patternHidden')}
		</p>
		{#if visible}
			<div class="mt-3 flex flex-wrap gap-2">
				{#each sequence as item, index (`${item}-${index}`)}
					<span
						class="flex h-16 min-w-16 items-center justify-center border-2 border-[var(--color-border)] bg-white p-2 font-black shadow-[var(--shadow-hard-sm)]"
						aria-label={labelSymbolToken(item, locale)}
					>
						<SymbolGlyph token={item} size="md" />
					</span>
				{/each}
			</div>
		{:else}
			<p class="mt-3 font-bold">{t('arena.recallHint')}</p>
		{/if}
	</div>
{/if}
