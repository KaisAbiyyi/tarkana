<script lang="ts">
	type Props = {
		title: string;
		description: string;
	};

	let { title, description }: Props = $props();
</script>

<article class="category-card">
	<div class="category-motif" aria-hidden="true">
		{#if title === 'Pola Angka'}
			<!-- Ascending bars -->
			<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
				<rect
					x="4"
					y="24"
					width="8"
					height="12"
					fill="var(--color-primary)"
					stroke="currentColor"
					stroke-width="2.5"
				/>
				<rect
					x="16"
					y="14"
					width="8"
					height="22"
					fill="var(--color-accent)"
					stroke="currentColor"
					stroke-width="2.5"
				/>
				<rect
					x="28"
					y="4"
					width="8"
					height="32"
					fill="var(--color-lime)"
					stroke="currentColor"
					stroke-width="2.5"
				/>
			</svg>
		{:else if title === 'Pola Simbol'}
			<!-- Geometric shapes -->
			<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
				<circle
					cx="10"
					cy="20"
					r="6"
					fill="var(--color-primary)"
					stroke="currentColor"
					stroke-width="2.5"
				/>
				<path
					d="M26 12L34 26H18L26 12Z"
					fill="var(--color-accent)"
					stroke="currentColor"
					stroke-width="2.5"
				/>
			</svg>
		{:else if title === 'Deduksi Singkat'}
			<!-- Connected nodes -->
			<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
				<circle
					cx="8"
					cy="8"
					r="5"
					fill="var(--color-lime)"
					stroke="currentColor"
					stroke-width="2.5"
				/>
				<circle
					cx="32"
					cy="16"
					r="5"
					fill="var(--color-primary)"
					stroke="currentColor"
					stroke-width="2.5"
				/>
				<circle
					cx="16"
					cy="32"
					r="5"
					fill="var(--color-accent)"
					stroke="currentColor"
					stroke-width="2.5"
				/>
				<path d="M12 10L28 14" stroke="currentColor" stroke-width="2.5" />
				<path d="M30 20L19 29" stroke="currentColor" stroke-width="2.5" />
			</svg>
		{:else}
			<!-- Memory Pattern Grid -->
			<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
				<rect
					x="6"
					y="6"
					width="12"
					height="12"
					fill="white"
					stroke="currentColor"
					stroke-width="2.5"
				/>
				<rect
					x="22"
					y="6"
					width="12"
					height="12"
					fill="var(--color-primary)"
					stroke="currentColor"
					stroke-width="2.5"
				/>
				<rect
					x="6"
					y="22"
					width="12"
					height="12"
					fill="var(--color-accent)"
					stroke="currentColor"
					stroke-width="2.5"
				/>
				<rect
					x="22"
					y="22"
					width="12"
					height="12"
					fill="white"
					stroke="currentColor"
					stroke-width="2.5"
				/>
			</svg>
		{/if}
	</div>
	<h3>{title}</h3>
	<p>{description}</p>
</article>

<style>
	.category-card {
		display: flex;
		height: 100%;
		min-width: 0;
		flex-direction: column;
		border: 3px solid var(--color-border);
		background: white;
		padding: var(--space-3);
		box-shadow: var(--shadow-level-1);
	}

	.category-motif {
		width: 44px;
		height: 44px;
		margin-bottom: var(--space-3);
		color: var(--color-ink);
		transition: transform 180ms ease;
	}

	.category-motif :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
	}

	.category-card h3 {
		margin: 0 0 var(--space-1);
		font-family: var(--font-display);
		font-size: 1.125rem;
		line-height: 1.3;
		font-weight: 800;
	}

	.category-card p {
		margin: 0;
		font-size: 0.9375rem;
		line-height: 1.6;
		color: var(--color-muted);
		text-wrap: pretty;
	}

	@media (hover: hover) and (prefers-reduced-motion: no-preference) {
		.category-card:hover .category-motif {
			transform: translateY(-2px) rotate(2deg);
		}
	}
</style>
