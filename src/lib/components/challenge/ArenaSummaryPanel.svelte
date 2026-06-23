<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { Snippet } from 'svelte';
	import { gsap } from 'gsap';
	import Button from '$lib/components/primitives/Button.svelte';
	import GameFeedbackMessage from '$lib/components/primitives/GameFeedbackMessage.svelte';
	import { getI18nContext } from '$lib/i18n/context';

	type Props = {
		modeName: string;
		sessionName: string;
		modeDescription: string;
		questionCount: number | null;
		estimatedMinutes: number | null;
		isReady: boolean;
		loading: boolean;
		errorMessage?: string | null;
		rank: string;
		rating: number;
		motif?: Snippet;
		onstart: () => void | Promise<void>;
	};

	let {
		modeName,
		sessionName,
		modeDescription,
		questionCount,
		estimatedMinutes,
		isReady,
		loading,
		errorMessage = null,
		rank,
		rating,
		motif,
		onstart
	}: Props = $props();
	const { t } = getI18nContext();

	let contentElement = $state<HTMLElement | null>(null);
	let ctaLabelElement = $state<HTMLElement | null>(null);
	let previousConfiguration = '';
	let previousCtaLabel = '';
	let ctaLabel = $derived(
		loading
			? t('prep.preparingRound')
			: isReady
				? t('dashboard.startMode', { mode: modeName })
				: t('prep.chooseConfiguration')
	);
	let ctaMetadata = $derived(
		questionCount && estimatedMinutes
			? t('prep.questionsMinutes', { questions: questionCount, minutes: estimatedMinutes })
			: t('prep.selectBoth')
	);

	$effect(() => {
		const signature = `${modeName}:${sessionName}:${questionCount ?? 0}`;
		if (!previousConfiguration) {
			previousConfiguration = signature;
			return;
		}
		if (signature === previousConfiguration || !contentElement) return;
		previousConfiguration = signature;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		gsap.killTweensOf(contentElement);
		gsap.fromTo(
			contentElement,
			{ y: 8, opacity: 0.65 },
			{ y: 0, opacity: 1, duration: 0.24, ease: 'power2.out', clearProps: 'transform,opacity' }
		);
	});

	$effect(() => {
		const label = ctaLabel;
		if (!previousCtaLabel) {
			previousCtaLabel = label;
			return;
		}
		if (label === previousCtaLabel || !ctaLabelElement) return;
		previousCtaLabel = label;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		gsap.killTweensOf(ctaLabelElement);
		gsap.fromTo(
			ctaLabelElement,
			{ x: -5, opacity: 0.55 },
			{ x: 0, opacity: 1, duration: 0.18, ease: 'power2.out', clearProps: 'transform,opacity' }
		);
	});

	onDestroy(() => gsap.killTweensOf([contentElement, ctaLabelElement]));
</script>

<section class="loadout" aria-labelledby="loadout-title">
	<div class="loadout-topline">
		<p>{t('prep.yourRound')}</p>
		<span>{t('prep.ready')}</span>
	</div>

	<div bind:this={contentElement} class="loadout-content">
		<div class="loadout-title-row">
			<div class="loadout-motif" aria-hidden="true">
				{#if motif}{@render motif()}{:else}<span class="empty-motif">?</span>{/if}
			</div>
			<div>
				<h2 id="loadout-title">{modeName}</h2>
				<p class="session-name">{sessionName}</p>
			</div>
		</div>
		<p class="mode-description">{modeDescription}</p>
	</div>

	<dl class="loadout-meta">
		<div>
			<dt>{t('prep.duration')}</dt>
			<dd>
				{estimatedMinutes
					? t('prep.aboutMinutes', { minutes: estimatedMinutes })
					: t('prep.waitingSession')}
			</dd>
		</div>
		<div>
			<dt>{t('prep.count')}</dt>
			<dd>
				{questionCount
					? t('prep.questionCount', { count: questionCount })
					: t('prep.waitingSession')}
			</dd>
		</div>
		<div>
			<dt>{t('arena.status')}</dt>
			<dd>{t('prep.ranked')}</dd>
		</div>
		<div>
			<dt>{t('prep.review')}</dt>
			<dd>{t('arena.reviewAfter')}</dd>
		</div>
	</dl>

	<div class="verified-score">
		<span aria-hidden="true">✓</span>
		<div>
			<strong>{t('prep.verifiedScore')}</strong>
			<p>{t('prep.verifiedBody')}</p>
		</div>
	</div>

	<div class="rating-context">
		<p><strong>{rank}</strong> · {t('common.logicRating')} {rating}</p>
		<p>{t('prep.ratingImpact')}</p>
	</div>

	{#if errorMessage}
		<GameFeedbackMessage tone="error" message={`${errorMessage} ${t('prep.choiceSaved')}`} />
	{:else if isReady && !loading}
		<GameFeedbackMessage tone="success" message={t('prep.locked')} />
	{/if}

	<div class="cta-block">
		<Button
			variant="ink"
			size="lg"
			class="w-full text-base"
			disabled={!isReady}
			{loading}
			label={ctaLabel}
			onclick={onstart}
		>
			<span bind:this={ctaLabelElement}>{ctaLabel}</span>
			{#if isReady && !loading}<span aria-hidden="true">→</span>{/if}
		</Button>
		<p>{ctaMetadata}</p>
		<p class="timer-copy">{t('prep.timerStarts')}</p>
	</div>
</section>

<style>
	.loadout {
		display: grid;
		gap: 1rem;
		border: 3px solid var(--color-border);
		background: var(--color-primary);
		padding: 1.15rem;
		box-shadow: var(--shadow-hard-lg);
	}

	.loadout-topline,
	.loadout-title-row,
	.verified-score {
		display: flex;
		align-items: center;
	}

	.loadout-topline {
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 0.65rem;
		border-bottom: 2px solid var(--color-border);
	}

	.loadout-topline p,
	.loadout-topline span {
		margin: 0;
		font-size: 0.68rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.loadout-topline span {
		border: 2px solid var(--color-border);
		background: white;
		padding: 0.2rem 0.4rem;
	}

	.loadout-content {
		display: grid;
		gap: 0.65rem;
	}

	.loadout-title-row {
		align-items: flex-start;
		gap: 0.85rem;
	}

	.loadout-motif {
		display: grid;
		width: 4rem;
		height: 4rem;
		flex: 0 0 auto;
		place-items: center;
		border: 3px solid var(--color-border);
		background: var(--color-paper);
		box-shadow: 3px 3px 0 var(--color-border);
	}

	.empty-motif {
		font-size: 1.75rem;
		font-weight: 900;
	}

	h2,
	p {
		margin: 0;
	}

	h2 {
		font-family: var(--font-display);
		font-size: clamp(1.55rem, 3vw, 2rem);
		font-weight: 900;
		line-height: 1;
	}

	.session-name {
		margin-top: 0.35rem;
		font-size: 0.82rem;
		font-weight: 900;
	}

	.mode-description {
		font-size: 0.84rem;
		font-weight: 700;
		line-height: 1.4;
	}

	.loadout-meta {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.45rem;
		margin: 0;
	}

	.loadout-meta div {
		border: 2px solid var(--color-border);
		background: rgba(255, 255, 255, 0.68);
		padding: 0.5rem;
	}

	.loadout-meta dt {
		font-size: 0.62rem;
		font-weight: 900;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.loadout-meta dd {
		margin: 0.15rem 0 0;
		font-size: 0.75rem;
		font-weight: 750;
		line-height: 1.2;
	}

	.verified-score {
		align-items: flex-start;
		gap: 0.65rem;
	}

	.verified-score > span {
		display: grid;
		width: 1.6rem;
		height: 1.6rem;
		flex: 0 0 auto;
		place-items: center;
		border: 2px solid var(--color-border);
		border-radius: 999px;
		background: var(--color-lime);
		font-weight: 900;
	}

	.verified-score strong,
	.rating-context strong {
		font-size: 0.8rem;
		font-weight: 900;
	}

	.verified-score p,
	.rating-context p {
		font-size: 0.72rem;
		font-weight: 700;
		line-height: 1.35;
	}

	.rating-context {
		display: grid;
		gap: 0.2rem;
		border-left: 4px solid var(--color-border);
		padding-left: 0.65rem;
	}

	.cta-block {
		display: grid;
		gap: 0.35rem;
		padding-top: 0.9rem;
		border-top: 3px solid var(--color-border);
	}

	.cta-block p {
		text-align: center;
		font-size: 0.72rem;
		font-weight: 850;
	}

	.cta-block .timer-copy {
		font-size: 0.66rem;
		font-weight: 650;
		color: #4b3d0d;
	}
</style>
