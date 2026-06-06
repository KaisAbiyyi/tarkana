<script lang="ts">
	import {
		isVisualSymbolToken,
		labelSymbolToken,
		symbolRotation
	} from '$lib/shared/presentation/symbols';

	type Props = {
		token: string;
		size?: 'sm' | 'md' | 'lg';
		decorative?: boolean;
	};

	let { token, size = 'md', decorative = false }: Props = $props();

	const sizeClass: Record<NonNullable<Props['size']>, string> = {
		sm: 'h-7 w-7',
		md: 'h-10 w-10',
		lg: 'h-14 w-14 sm:h-16 sm:w-16'
	};

	let label = $derived(labelSymbolToken(token));
	let visual = $derived(isVisualSymbolToken(token));
	let rotation = $derived(visual ? symbolRotation(token) : 0);
</script>

{#if visual}
	<svg
		class={`${sizeClass[size]} shrink-0 overflow-visible`}
		viewBox="0 0 64 64"
		role={decorative ? undefined : 'img'}
		aria-label={decorative ? undefined : label}
		aria-hidden={decorative ? 'true' : undefined}
		style={`transform: rotate(${rotation}deg)`}
	>
		{#if token === 'circle'}
			<circle
				cx="32"
				cy="32"
				r="24"
				fill="var(--symbol-fill, var(--color-accent))"
				stroke="var(--color-border)"
				stroke-width="5"
			/>
		{:else if token === 'square'}
			<rect
				x="9"
				y="9"
				width="46"
				height="46"
				rx="3"
				fill="var(--symbol-fill, var(--color-info))"
				stroke="var(--color-border)"
				stroke-width="5"
			/>
		{:else if token === 'diamond'}
			<path
				d="M32 6 58 32 32 58 6 32Z"
				fill="var(--symbol-fill, var(--color-danger))"
				stroke="var(--color-border)"
				stroke-width="5"
				stroke-linejoin="round"
			/>
		{:else if token === 'star'}
			<path
				d="m32 5 8 17 19 2-14 13 4 19-17-9-17 9 4-19L5 24l19-2Z"
				fill="var(--symbol-fill, var(--color-primary))"
				stroke="var(--color-border)"
				stroke-width="4"
				stroke-linejoin="round"
			/>
		{:else}
			<path
				d="M32 7 57 53H7Z"
				fill="var(--symbol-fill, var(--color-primary))"
				stroke="var(--color-border)"
				stroke-width="5"
				stroke-linejoin="round"
			/>
			<path d="M32 15 44 38H20Z" fill="rgba(255,255,255,.35)" aria-hidden="true" />
		{/if}
	</svg>
{:else}
	<span class="font-black">{label}</span>
{/if}
