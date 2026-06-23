<script lang="ts">
	import ProgressBar from '$lib/components/primitives/ProgressBar.svelte';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import { createArenaLabels } from '$lib/shared/presentation/arena-labels';
	import { getI18nContext } from '$lib/i18n/context';
	import { formatNumber, labelQuestionType } from '$lib/shared/presentation/format';
	import type { QuestionType } from '$lib/shared/constants/challenge';

	type Props = {
		currentQuestion: number;
		totalQuestions: number;
		streak: number;
		sessionScore: number;
		remainingSeconds: number;
		totalSeconds: number;
		questionType?: QuestionType;
		modeName?: string;
	};

	let {
		currentQuestion,
		totalQuestions,
		streak,
		sessionScore,
		remainingSeconds,
		totalSeconds,
		questionType,
		modeName
	}: Props = $props();
	const { locale, t } = getI18nContext();
	const ARENA_LABELS = createArenaLabels(locale);

	let timerRatio = $derived(totalSeconds > 0 ? remainingSeconds / totalSeconds : 0);
	let timerUrgent = $derived(remainingSeconds > 0 && timerRatio <= 0.25);
	let timerExpired = $derived(remainingSeconds <= 0);
</script>

<section class="hud" aria-label={t('arena.status')}>
	<!-- Mobile: compact sticky timer + progress row -->
	<div
		class="hud__mobile-timer"
		class:hud__mobile-timer--urgent={timerUrgent}
		class:hud__mobile-timer--expired={timerExpired}
	>
		<div class="hud__timer-row">
			<span class="hud__timer-icon" aria-hidden="true">{timerExpired ? '✕' : '⏱'}</span>
			<span class="hud__timer-label">{ARENA_LABELS.remainingTime}</span>
			<span class="hud__timer-value" aria-live="off">
				{formatNumber(Math.max(0, remainingSeconds), locale)}<span class="hud__timer-unit"
					>{t('format.secondUnit')}</span
				>
			</span>
		</div>
		<ProgressBar
			value={remainingSeconds}
			max={totalSeconds}
			label={ARENA_LABELS.remainingTime}
			tone={timerExpired ? 'danger' : timerUrgent ? 'primary' : 'accent'}
			compact
		/>
	</div>

	<!-- Stats strip: progress, streak, score -->
	<div class="hud__stats">
		<div class="hud__stat" id="hud-progress">
			<p class="hud__stat-label">{ARENA_LABELS.progress}</p>
			<p class="hud__stat-value">{ARENA_LABELS.questionOf(currentQuestion, totalQuestions)}</p>
		</div>

		<div class="hud__stat hud__stat--streak" class:hud__stat--active={streak > 1} id="hud-streak">
			<p class="hud__stat-label">{ARENA_LABELS.streak}</p>
			<p class="hud__stat-value">
				{#if streak > 0}🔥{/if}
				{formatNumber(streak, locale)}
			</p>
		</div>

		<div
			class="hud__stat hud__stat--score"
			class:hud__stat--active={sessionScore > 0}
			id="hud-score"
		>
			<p class="hud__stat-label">{ARENA_LABELS.score}</p>
			<p class="hud__stat-value">{formatNumber(sessionScore, locale)}</p>
		</div>

		{#if questionType}
			<div class="hud__stat hud__stat--category">
				<Badge tone="accent">{labelQuestionType(questionType, locale)}</Badge>
			</div>
		{/if}

		<div
			class="hud__stat hud__stat--timer desktop-timer"
			class:timer-urgent={timerUrgent}
			class:timer-expired={timerExpired}
		>
			<p class="hud__stat-label">{ARENA_LABELS.remainingTime}</p>
			<p class="hud__stat-value">
				<span class="hud__timer-icon mr-1" aria-hidden="true">{timerExpired ? '✕' : '⏱'}</span>
				{formatNumber(Math.max(0, remainingSeconds), locale)}<span class="hud__timer-unit"
					>{t('format.secondUnit')}</span
				>
			</p>
		</div>
	</div>

	<!-- Progress bar -->
	<div class="hud__progress-bar">
		<ProgressBar
			value={currentQuestion}
			max={totalQuestions}
			label={t('arena.challengeProgress')}
			tone="accent"
			compact
		/>
	</div>
</section>

<style>
	.hud {
		display: grid;
		gap: 0;
		border: 3px solid var(--color-border);
		background: var(--color-surface);
		box-shadow: var(--shadow-hard-sm);
		overflow: hidden;
	}

	/* Mobile timer - visible only on small screens */
	.hud__mobile-timer {
		display: none;
		padding: 0.65rem 0.85rem;
		gap: 0.35rem;
		background: var(--color-surface);
		border-bottom: 2px solid var(--color-border);
		transition: background-color 200ms ease;
	}

	.hud__mobile-timer--urgent {
		background: var(--color-primary);
	}

	.hud__mobile-timer--expired {
		background: var(--color-ink);
		color: var(--color-primary);
	}

	.hud__timer-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.hud__timer-icon {
		font-size: 0.75rem;
		font-weight: 900;
	}

	.hud__timer-label {
		font-size: 0.65rem;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		flex: 1;
	}

	.hud__timer-value {
		font-size: 1.25rem;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}

	.hud__timer-unit {
		font-size: 0.65em;
		font-weight: 800;
	}

	/* Stats strip */
	.hud__stats {
		display: flex;
		align-items: stretch;
		padding: 0;
	}

	.hud__stat {
		flex: 1;
		display: grid;
		gap: 0.1rem;
		padding: 0.65rem 0.75rem;
		text-align: center;
		border-right: 2px solid var(--color-border);
	}

	.hud__stat:last-child {
		border-right: none;
	}

	.hud__stat--category {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 auto;
		padding: 0.5rem 0.75rem;
	}

	.hud__stat-label {
		margin: 0;
		font-size: 0.58rem;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-muted);
	}

	.hud__stat-value {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 900;
		line-height: 1.2;
		font-variant-numeric: tabular-nums;
	}

	.hud__stat--active .hud__stat-value {
		animation: stat-pop 300ms cubic-bezier(0.2, 1.4, 0.4, 1);
	}

	@keyframes stat-pop {
		50% {
			transform: scale(1.12);
		}
	}

	/* Progress bar at bottom of HUD */
	.hud__progress-bar {
		padding: 0 0.75rem 0.5rem;
	}

	.desktop-timer {
		display: none;
	}

	.desktop-timer.timer-urgent {
		background: var(--color-primary);
	}

	.desktop-timer.timer-expired {
		background: var(--color-ink);
		color: var(--color-primary);
	}

	.desktop-timer.timer-expired .hud__stat-label {
		color: var(--color-primary);
		opacity: 0.8;
	}

	/* Desktop: hide inline mobile timer, show timer in stat row */
	@media (min-width: 1024px) {
		.hud__mobile-timer {
			display: none !important;
		}
		.desktop-timer {
			display: grid;
			min-width: 5rem;
		}
	}

	/* Mobile: show compact timer, stack vertically */
	@media (max-width: 1023px) {
		.hud__mobile-timer {
			display: grid;
		}

		.hud__stat--category {
			display: none;
		}
	}

	@media (max-width: 520px) {
		.hud__stat {
			padding: 0.5rem 0.45rem;
		}

		.hud__stat-value {
			font-size: 0.78rem;
		}

		.hud__stat-label {
			font-size: 0.52rem;
		}
	}
</style>
