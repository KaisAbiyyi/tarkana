<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { Snippet } from 'svelte';
	import { gsap } from 'gsap';
	import { getI18nContext } from '$lib/i18n/context';

	type Props = {
		id: string;
		name: string;
		value: string;
		selected?: boolean;
		disabled?: boolean;
		loading?: boolean;
		onselect?: () => void;
		title: string;
		description: string;
		meta?: string;
		recommended?: boolean;
		motif?: Snippet;
		extras?: Snippet;
	};

	let {
		id,
		name,
		value,
		selected = false,
		disabled = false,
		loading = false,
		onselect,
		title,
		description,
		meta,
		recommended = false,
		motif,
		extras
	}: Props = $props();
	const { t } = getI18nContext();

	let cardElement = $state<HTMLLabelElement | null>(null);
	let motifElement = $state<HTMLSpanElement | null>(null);
	let indicatorElement = $state<HTMLSpanElement | null>(null);
	let labelElement = $state<HTMLSpanElement | null>(null);
	let initialized = false;
	let previousSelected = false;

	$effect(() => {
		const isSelected = selected;
		if (!cardElement || !indicatorElement || !labelElement || !motifElement) return;

		if (!initialized) {
			initialized = true;
			previousSelected = isSelected;
			return;
		}
		if (isSelected === previousSelected) return;
		previousSelected = isSelected;

		const targets = [cardElement, motifElement, indicatorElement, labelElement];
		gsap.killTweensOf(targets);
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		const timeline = gsap.timeline({ defaults: { overwrite: 'auto' } });
		if (isSelected) {
			timeline
				.fromTo(
					cardElement,
					{ y: 2, boxShadow: '1px 1px 0 var(--color-border)' },
					{
						y: -3,
						boxShadow: '4px 4px 0 var(--color-border)',
						duration: 0.24,
						ease: 'back.out(1.35)',
						clearProps: 'transform,boxShadow'
					}
				)
				.fromTo(
					indicatorElement,
					{ scale: 0.4, rotate: -18 },
					{ scale: 1, rotate: 0, duration: 0.2, ease: 'back.out(1.8)', clearProps: 'transform' },
					'<0.04'
				)
				.fromTo(
					labelElement,
					{ y: 6, opacity: 0 },
					{ y: 0, opacity: 1, duration: 0.16, ease: 'power2.out', clearProps: 'transform,opacity' },
					'<'
				)
				.fromTo(
					motifElement,
					{ scale: 0.82, rotate: -6 },
					{ scale: 1, rotate: 0, duration: 0.24, ease: 'back.out(1.7)', clearProps: 'transform' },
					'<'
				);
		} else {
			timeline.fromTo(
				cardElement,
				{ y: -3, boxShadow: '4px 4px 0 var(--color-border)' },
				{
					y: 0,
					boxShadow: '2px 2px 0 var(--color-border)',
					duration: 0.18,
					ease: 'power2.out',
					clearProps: 'transform,boxShadow'
				}
			);
		}

		return () => timeline.kill();
	});

	onDestroy(() => {
		gsap.killTweensOf([cardElement, motifElement, indicatorElement, labelElement]);
	});

	function handleKeydown(event: KeyboardEvent): void {
		if (disabled || loading) return;
		if (event.key === 'Enter') {
			event.preventDefault();
			onselect?.();
		}
	}
</script>

<label
	bind:this={cardElement}
	class="game-choice-card"
	data-selected={selected}
	data-disabled={disabled}
	data-loading={loading}
>
	<input
		type="radio"
		{id}
		{name}
		{value}
		checked={selected}
		disabled={disabled || loading}
		onchange={onselect}
		onkeydown={handleKeydown}
		aria-checked={selected}
		aria-describedby={`${id}-description`}
	/>

	{#if recommended}
		<span class="recommendation">{t('prep.recommended')}</span>
	{/if}

	<div class="choice-heading">
		<span bind:this={motifElement} class="choice-motif" aria-hidden="true">
			{#if motif}{@render motif()}{:else}<span class="fallback-motif"></span>{/if}
		</span>
		<span class="choice-copy">
			<span class="choice-title">{title}</span>
			<span bind:this={labelElement} class="selected-label" aria-hidden={!selected}
				>{t('prep.selected')}</span
			>
		</span>
		<span class="radio-indicator" aria-hidden="true">
			<span bind:this={indicatorElement} class="radio-indicator-fill">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4">
					<path d="m5 12 4 4L19 6" />
				</svg>
			</span>
		</span>
	</div>

	<p id={`${id}-description`} class="choice-description">{description}</p>
	{#if meta}<p class="choice-meta">{meta}</p>{/if}
	{#if extras}<div class="choice-extras">{@render extras()}</div>{/if}

	{#if loading}<span class="availability-label">{t('prep.loading')}</span>{/if}
	{#if disabled && !loading}<span class="availability-label">{t('prep.unavailable')}</span>{/if}
</label>

<style>
	.game-choice-card {
		position: relative;
		display: flex;
		min-height: 136px;
		cursor: pointer;
		flex-direction: column;
		gap: 0.65rem;
		border: 3px solid var(--color-border);
		background: var(--game-choice-default);
		padding: 1rem;
		box-shadow: var(--shadow-small);
		transform: translate(0);
		transition:
			background-color 140ms ease,
			box-shadow 140ms ease,
			transform 140ms ease,
			opacity 140ms ease;
	}

	.game-choice-card:hover:not([data-disabled='true']):not([data-loading='true']):not(
			[data-selected='true']
		) {
		box-shadow: 4px 5px 0 var(--color-border);
		transform: translateY(-2px);
	}

	.game-choice-card:active:not([data-disabled='true']):not([data-loading='true']) {
		box-shadow: var(--shadow-pressed);
		transform: translate(2px, 2px);
	}

	.game-choice-card[data-selected='true'] {
		background: var(--game-choice-selected);
		box-shadow: var(--shadow-medium);
		transform: translateY(-3px);
	}

	.game-choice-card[data-disabled='true'],
	.game-choice-card[data-loading='true'] {
		cursor: not-allowed;
		background: var(--game-choice-disabled);
		box-shadow: none;
		color: var(--color-muted);
		opacity: 0.7;
		transform: none;
	}

	.game-choice-card:has(input:focus-visible) {
		outline: var(--focus-ring-width) solid var(--color-blue);
		outline-offset: 4px;
	}

	input {
		position: absolute;
		z-index: 2;
		inset: 0;
		width: 100%;
		height: 100%;
		cursor: inherit;
		opacity: 0;
	}

	.recommendation,
	.availability-label {
		width: fit-content;
		border: 2px solid var(--color-border);
		background: var(--color-primary);
		padding: 0.15rem 0.45rem;
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.recommendation {
		position: absolute;
		top: -0.75rem;
		left: 1rem;
	}

	.availability-label {
		margin-top: auto;
		background: white;
	}

	.choice-heading {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.choice-motif {
		display: grid;
		width: 2.75rem;
		height: 2.75rem;
		flex: 0 0 auto;
		place-items: center;
		border: 2px solid var(--color-border);
		background: var(--color-paper);
		box-shadow: 2px 2px 0 var(--color-border);
		transition: transform 150ms ease;
	}

	.game-choice-card:hover:not([data-disabled='true']) .choice-motif {
		transform: rotate(-3deg) scale(1.04);
	}

	.game-choice-card:active:not([data-disabled='true']) .choice-motif {
		transform: scale(0.9);
	}

	.choice-copy {
		min-width: 0;
		flex: 1;
	}

	.choice-title {
		display: block;
		font-size: 1rem;
		font-weight: 900;
		line-height: 1.15;
	}

	.selected-label {
		display: block;
		min-height: 1rem;
		margin-top: 0.15rem;
		font-size: 0.68rem;
		font-weight: 900;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		visibility: hidden;
	}

	.game-choice-card[data-selected='true'] .selected-label {
		visibility: visible;
	}

	.radio-indicator {
		display: grid;
		width: 1.65rem;
		height: 1.65rem;
		flex: 0 0 auto;
		place-items: center;
		border: 3px solid var(--color-border);
		border-radius: 999px;
		background: white;
	}

	.radio-indicator-fill {
		display: grid;
		width: 100%;
		height: 100%;
		place-items: center;
		border-radius: inherit;
		background: var(--color-border);
		color: white;
		opacity: 0;
		transform: scale(0.4);
	}

	.radio-indicator-fill svg {
		width: 0.85rem;
		height: 0.85rem;
	}

	.game-choice-card[data-selected='true'] .radio-indicator-fill {
		opacity: 1;
		transform: scale(1);
	}

	.choice-description,
	.choice-meta {
		margin: 0;
		font-size: 0.82rem;
		font-weight: 650;
		line-height: 1.35;
	}

	.choice-description {
		color: var(--color-muted);
	}

	.game-choice-card[data-selected='true'] .choice-description {
		color: var(--color-ink);
	}

	.choice-meta {
		margin-top: auto;
		font-weight: 900;
	}

	.choice-extras {
		margin-top: auto;
	}

	.fallback-motif {
		width: 1.15rem;
		height: 1.15rem;
		border: 3px solid var(--color-border);
		border-radius: 999px;
	}

	@media (prefers-reduced-motion: reduce) {
		.game-choice-card,
		.choice-motif,
		.radio-indicator-fill {
			transition-duration: 0.01ms;
		}
	}
</style>
