<script lang="ts">
	import logoUrl from '$lib/assets/logo-tarkana.png';

	type Props = {
		size?: 'sm' | 'md' | 'lg';
		showText?: boolean;
		text?: string;
		href?: string;
		label?: string;
		class?: string;
	};

	let {
		size = 'md',
		showText = true,
		text = 'TARKANA',
		href,
		label = 'Tarkana',
		class: className = ''
	}: Props = $props();
</script>

{#if href}
	<a class={`brand-logo brand-logo--${size} ${className}`} {href} aria-label={label}>
		<img class="brand-logo__mark" src={logoUrl} alt="" aria-hidden="true" />
		{#if showText}
			<span class="brand-logo__text" translate="no">{text}</span>
		{/if}
	</a>
{:else}
	<div class={`brand-logo brand-logo--${size} ${className}`} aria-label={label}>
		<img class="brand-logo__mark" src={logoUrl} alt="" aria-hidden="true" />
		{#if showText}
			<span class="brand-logo__text" translate="no">{text}</span>
		{/if}
	</div>
{/if}

<style>
	.brand-logo {
		display: inline-flex;
		align-items: center;
		gap: 0.625rem;
		font-family: var(--font-display);
		font-weight: 800;
		line-height: 1;
		text-decoration: none;
	}

	.brand-logo__mark {
		display: block;
		width: var(--brand-logo-size);
		height: var(--brand-logo-size);
		object-fit: contain;
	}

	.brand-logo__text {
		letter-spacing: 0;
	}

	.brand-logo--sm {
		--brand-logo-size: 32px;
		font-size: 1rem;
	}

	.brand-logo--md {
		--brand-logo-size: 42px;
		font-size: 1.35rem;
	}

	.brand-logo--lg {
		--brand-logo-size: 52px;
		font-size: 1.5rem;
	}

	@media (max-width: 420px) {
		.brand-logo--md {
			--brand-logo-size: 36px;
			font-size: 1.1rem;
		}
	}
</style>
