<script lang="ts">
	import { onDestroy } from 'svelte';
	import { gsap } from 'gsap';
	import { getI18nContext } from '$lib/i18n/context';

	type StepState = 'pending' | 'active' | 'complete';
	type Props = {
		isSessionValid: boolean;
		isModeValid: boolean;
		isEntering: boolean;
	};

	let { isSessionValid, isModeValid, isEntering }: Props = $props();
	const { t } = getI18nContext();
	let stepElements = $state<HTMLElement[]>([]);
	let previousSignature = '';

	let steps = $derived([
		{
			label: t('prep.chooseSession'),
			state: (isSessionValid ? 'complete' : 'active') as StepState
		},
		{
			label: t('prep.chooseMode'),
			state: (isModeValid ? 'complete' : isSessionValid ? 'active' : 'pending') as StepState
		},
		{
			label: t('prep.enterArena'),
			state: (isEntering
				? 'complete'
				: isSessionValid && isModeValid
					? 'active'
					: 'pending') as StepState
		}
	]);
	let readyCount = $derived(
		(isSessionValid ? 1 : 0) + (isModeValid ? 1 : 0) + (isEntering ? 1 : 0)
	);
	let isReady = $derived(isSessionValid && isModeValid);
	let title = $derived(
		isEntering
			? t('prep.entering')
			: isReady
				? t('prep.configReady')
				: t('prep.completePreparation')
	);

	$effect(() => {
		const signature = steps.map((step) => step.state).join(':');
		if (!previousSignature) {
			previousSignature = signature;
			return;
		}
		if (signature === previousSignature) return;
		previousSignature = signature;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		const activeIndex = steps.findIndex((step) => step.state === 'active');
		const changedIndex = activeIndex === -1 ? 2 : activeIndex;
		const target = stepElements[changedIndex];
		if (!target) return;
		gsap.killTweensOf(target);
		gsap.fromTo(
			target,
			{ scale: 0.88, y: 3 },
			{ scale: 1, y: 0, duration: 0.26, ease: 'back.out(1.55)', clearProps: 'transform' }
		);
	});

	onDestroy(() => gsap.killTweensOf(stepElements));
</script>

<section class="readiness" aria-labelledby="readiness-title">
	<div class="readiness-heading">
		<div>
			<p class="readiness-kicker">{t('prep.roundPreparation')}</p>
			<h2 id="readiness-title">{title}</h2>
		</div>
		<span class="progress-pill">{t('prep.readyCount', { count: readyCount })}</span>
	</div>

	<div class="progress-track" aria-hidden="true">
		<span style={`width: ${(readyCount / 3) * 100}%`}></span>
	</div>

	<ol class="steps">
		{#each steps as step, index (step.label)}
			<li
				bind:this={stepElements[index]}
				class="step"
				data-state={step.state}
				aria-current={step.state === 'active' ? 'step' : undefined}
			>
				<span class="step-node" aria-hidden="true">
					{#if step.state === 'complete'}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4">
							<path d="m5 12 4 4L19 6" />
						</svg>
					{:else}
						{index + 1}
					{/if}
				</span>
				<span>{step.label}</span>
			</li>
		{/each}
	</ol>

	<p class="sr-only" aria-live="polite" aria-atomic="true">
		{title}. {t('prep.readyCount', { count: readyCount })}.
	</p>
</section>

<style>
	.readiness {
		display: grid;
		gap: 0.75rem;
		border: 2px solid var(--color-border);
		background: var(--color-surface);
		padding: 0.9rem 1rem;
		box-shadow: var(--shadow-hard-sm);
	}

	.readiness-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.readiness-kicker,
	h2 {
		margin: 0;
	}

	.readiness-kicker {
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-muted);
	}

	h2 {
		font-size: 1rem;
		font-weight: 900;
	}

	.progress-pill {
		flex: 0 0 auto;
		border: 2px solid var(--color-border);
		background: var(--color-paper);
		padding: 0.3rem 0.5rem;
		font-size: 0.68rem;
		font-weight: 900;
	}

	.progress-track {
		height: 0.45rem;
		border: 2px solid var(--color-border);
		background: #e6ded1;
	}

	.progress-track span {
		display: block;
		height: 100%;
		background: var(--color-accent);
		transition: width 240ms ease;
	}

	.steps {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.step {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		min-width: 0;
		font-size: 0.72rem;
		font-weight: 850;
		line-height: 1.15;
		color: var(--color-muted);
	}

	.step-node {
		display: grid;
		width: 1.55rem;
		height: 1.55rem;
		flex: 0 0 auto;
		place-items: center;
		border: 2px solid var(--color-border);
		border-radius: 999px;
		background: white;
		font-size: 0.68rem;
		font-weight: 900;
	}

	.step-node svg {
		width: 0.8rem;
		height: 0.8rem;
	}

	.step[data-state='complete'] {
		color: var(--color-ink);
	}

	.step[data-state='complete'] .step-node {
		background: var(--color-accent);
	}

	.step[data-state='active'] {
		color: var(--color-ink);
	}

	.step[data-state='active'] .step-node {
		background: var(--color-primary);
		box-shadow: 2px 2px 0 var(--color-border);
	}

	@media (max-width: 460px) {
		.readiness-heading {
			align-items: flex-start;
			flex-direction: column;
			gap: 0.5rem;
		}

		.steps {
			grid-template-columns: 1fr;
			gap: 0.35rem;
		}
	}
</style>
