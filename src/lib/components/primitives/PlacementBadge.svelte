<script lang="ts">
	import { getI18nContext } from '$lib/i18n/context';
	type Props = {
		position: number;
		class?: string;
	};

	let { position, class: className = '' }: Props = $props();
	const { t } = getI18nContext();

	let isTop3 = $derived(position >= 1 && position <= 3);

	let styleClass = $derived(
		position === 1
			? 'bg-yellow-400 text-yellow-900 border-yellow-600'
			: position === 2
				? 'bg-slate-300 text-slate-800 border-slate-500'
				: position === 3
					? 'bg-orange-300 text-orange-900 border-orange-600'
					: 'bg-[var(--color-paper)] text-[var(--color-text)] border-[var(--color-border)]'
	);
</script>

{#if isTop3}
	<div
		class={`relative flex h-8 w-8 items-center justify-center border-2 font-black shadow-[2px_2px_0px_0px_var(--color-border)] ${styleClass} ${className}`}
		aria-label={`${t('leaderboard.position')} ${position}`}
	>
		<svg
			class="absolute -top-1 -right-1 h-3 w-3 text-[var(--color-border)]"
			viewBox="0 0 24 24"
			fill="currentColor"
		>
			<path
				d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
			/>
		</svg>
		{position}
	</div>
{:else}
	<div
		class={`flex h-8 w-8 items-center justify-center border-2 font-black ${styleClass} ${className}`}
		aria-label={`${t('leaderboard.position')} ${position}`}
	>
		{position}
	</div>
{/if}
