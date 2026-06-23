<script lang="ts">
	import { getI18nContext } from '$lib/i18n/context';
	import { labelRank } from '$lib/shared/presentation/format';
	type Props = {
		rank: string; // Accepts string to be flexible, but expects RankName
		class?: string;
	};

	let { rank, class: className = '' }: Props = $props();
	const { locale, t } = getI18nContext();
	let localizedRank = $derived(labelRank(rank, locale));

	type TierStyle = {
		bg: string;
		text: string;
		icon: string; // SVG path
	};

	const tierStyles: Record<string, TierStyle> = {
		Unranked: {
			bg: 'bg-gray-100',
			text: 'text-gray-600',
			icon: '<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2" fill="none"/>'
		},
		'Bronze Mind': {
			bg: 'bg-[#cd7f32]',
			text: 'text-white',
			icon: '<path d="M12 4l8 14H4z" fill="currentColor"/>'
		},
		'Silver Solver': {
			bg: 'bg-[#c0c0c0]',
			text: 'text-black',
			icon: '<rect x="5" y="5" width="14" height="14" fill="currentColor"/>'
		},
		'Gold Analyst': {
			bg: 'bg-[#ffd700]',
			text: 'text-black',
			icon: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>'
		},
		'Platinum Strategist': {
			bg: 'bg-[#e5e4e2]',
			text: 'text-black',
			icon: '<path d="M12 2L2 9l3 13h14l3-13L12 2z" fill="currentColor"/>'
		},
		'Diamond Reasoner': {
			bg: 'bg-[#b9f2ff]',
			text: 'text-blue-900',
			icon: '<path d="M12 2L2 12l10 10 10-10L12 2z" fill="currentColor"/>'
		},
		Mastermind: {
			bg: 'bg-[#ff00ff]',
			text: 'text-white',
			icon: '<path d="M12 2l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" fill="currentColor"/>'
		}
	};

	let style = $derived(tierStyles[rank] || tierStyles.Unranked);
</script>

<div
	class="inline-flex items-center gap-1.5 border-[3px] border-[var(--color-border)] px-2 py-0.5 text-xs font-black uppercase shadow-[2px_2px_0px_0px_var(--color-border)] {style.bg} {style.text} {className}"
	aria-label={t('rank.aria', { rank: localizedRank })}
>
	<svg
		aria-hidden="true"
		class="h-3.5 w-3.5 flex-shrink-0"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html style.icon}
	</svg>
	<span>{localizedRank}</span>
</div>
