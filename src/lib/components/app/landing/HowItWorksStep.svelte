<script lang="ts">
	type Props = {
		stepNumber: string;
		title: string;
		description: string;
		isLast?: boolean;
	};

	let { stepNumber, title, description, isLast = false }: Props = $props();
</script>

<article class="hiw-step">
	<div class="hiw-rail" aria-hidden="true">
		<div class="hiw-number">{stepNumber}</div>
		{#if !isLast}<div class="hiw-mobile-connector"></div>{/if}
	</div>
	<div class="hiw-content">
		<h3>{title}</h3>
		<p>{description}</p>
	</div>
</article>

<style>
	.hiw-step {
		position: relative;
		display: grid;
		grid-template-rows: auto 1fr;
		justify-items: center;
		gap: var(--space-3);
		min-width: 0;
		text-align: center;
	}

	.hiw-rail {
		position: relative;
		z-index: 1;
	}

	.hiw-number {
		display: grid;
		width: 56px;
		height: 56px;
		place-items: center;
		border: 3px solid var(--color-border);
		background: var(--color-primary);
		box-shadow: var(--shadow-level-1);
		font-family: var(--font-display);
		font-size: 1.65rem;
		font-weight: 800;
	}

	.hiw-mobile-connector {
		display: none;
	}

	.hiw-content {
		max-width: 320px;
		min-width: 0;
	}

	.hiw-content h3 {
		margin: 0 0 var(--space-1);
		font-family: var(--font-display);
		font-size: 1.125rem;
		line-height: 1.25;
		font-weight: 800;
		text-wrap: balance;
	}

	.hiw-content p {
		margin: 0;
		font-size: 1rem;
		line-height: 1.65;
		color: var(--color-muted);
		text-wrap: pretty;
	}

	@media (max-width: 767px) {
		.hiw-step {
			grid-template-columns: 56px minmax(0, 1fr);
			grid-template-rows: auto;
			align-items: start;
			justify-items: stretch;
			gap: var(--space-3);
			text-align: left;
		}

		.hiw-rail {
			height: 100%;
		}

		.hiw-mobile-connector {
			position: absolute;
			top: 28px;
			bottom: -60px;
			left: 27px;
			z-index: -1;
			display: block;
			width: 3px;
			transform-origin: top;
			background: var(--color-border);
		}

		.hiw-content {
			max-width: none;
			padding-top: 0.25rem;
		}

		.hiw-content h3 {
			font-size: 1.125rem;
		}
	}
</style>
