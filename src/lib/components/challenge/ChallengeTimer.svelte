<script lang="ts">
	import ProgressBar from '$lib/components/primitives/ProgressBar.svelte';
	import { createArenaLabels } from '$lib/shared/presentation/arena-labels';
	import { getI18nContext } from '$lib/i18n/context';
	import { formatNumber } from '$lib/shared/presentation/format';

	type TimerState = 'normal' | 'warning' | 'critical' | 'expired';

	type Props = {
		remainingSeconds: number;
		totalSeconds: number;
		compact?: boolean;
	};

	let { remainingSeconds, totalSeconds, compact = false }: Props = $props();
	const { locale, t } = getI18nContext();
	const ARENA_LABELS = createArenaLabels(locale);

	let timerState = $derived.by((): TimerState => {
		if (remainingSeconds <= 0) return 'expired';
		const ratio = remainingSeconds / totalSeconds;
		if (ratio <= 0.15 || remainingSeconds <= 3) return 'critical';
		if (ratio <= 0.25 || remainingSeconds <= 5) return 'warning';
		return 'normal';
	});

	let stateLabel = $derived.by(() => {
		switch (timerState) {
			case 'expired':
				return ARENA_LABELS.timerExpired;
			case 'critical':
				return ARENA_LABELS.timerCritical;
			case 'warning':
				return ARENA_LABELS.timerWarning;
			default:
				return ARENA_LABELS.timerNormal;
		}
	});

	let stateIcon = $derived.by(() => {
		switch (timerState) {
			case 'expired':
				return '✕';
			case 'critical':
				return '‼';
			case 'warning':
				return '◷';
			default:
				return '⏱';
		}
	});

	let displaySeconds = $derived(Math.max(0, remainingSeconds));

	let accessibleTime = $derived.by(() => {
		const minutes = Math.floor(displaySeconds / 60);
		const seconds = displaySeconds % 60;
		if (minutes > 0)
			return t('arena.minutesSecondsLeft', {
				minutes: formatNumber(minutes, locale),
				seconds: formatNumber(seconds, locale)
			});
		return t('arena.secondsLeft', { seconds: formatNumber(seconds, locale) });
	});

	let progressTone = $derived.by((): 'primary' | 'accent' | 'success' | 'danger' => {
		if (timerState === 'expired' || timerState === 'critical') return 'danger';
		if (timerState === 'warning') return 'primary';
		return 'accent';
	});
</script>

<div
	class="timer timer--{timerState}"
	class:timer--compact={compact}
	role="timer"
	aria-label={ARENA_LABELS.remainingTime}
	aria-live={timerState === 'critical' ? 'assertive' : 'off'}
>
	<div class="timer__header">
		<div class="timer__label-group">
			<span class="timer__icon" aria-hidden="true">{stateIcon}</span>
			<span class="timer__label">{ARENA_LABELS.remainingTime}</span>
		</div>
		<div class="timer__digits" aria-hidden="true">
			{formatNumber(displaySeconds, locale)}<span class="timer__unit">{t('format.secondUnit')}</span
			>
		</div>
	</div>

	{#if !compact}
		<span class="timer__state-text" aria-hidden="true">{stateLabel}</span>
	{/if}

	<div class="timer__bar">
		<ProgressBar
			value={remainingSeconds}
			max={totalSeconds}
			label={t('arena.timeRemaining')}
			tone={progressTone}
			compact
		/>
	</div>

	<p class="sr-only">{accessibleTime}. {stateLabel}.</p>
</div>

<style>
	.timer {
		display: grid;
		gap: 0.5rem;
		border: 3px solid var(--color-border);
		padding: 1rem;
		box-shadow: var(--shadow-hard-sm);
		background: var(--color-surface);
		transition:
			background-color 200ms ease,
			border-color 200ms ease;
	}

	.timer--compact {
		padding: 0.65rem 0.85rem;
		gap: 0.35rem;
	}

	.timer--warning {
		background: var(--color-primary);
		border-width: 3px;
	}

	.timer--critical {
		background: var(--color-danger);
		color: white;
		border-width: 4px;
	}

	.timer--expired {
		background: var(--color-ink);
		color: var(--color-primary);
		border-color: var(--color-ink);
	}

	.timer__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.timer__label-group {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}

	.timer__icon {
		display: grid;
		width: 1.5rem;
		height: 1.5rem;
		place-items: center;
		border: 2px solid currentColor;
		font-size: 0.7rem;
		font-weight: 900;
		flex: 0 0 auto;
	}

	.timer--expired .timer__icon {
		border-color: var(--color-primary);
	}

	.timer__label {
		font-size: 0.7rem;
		font-weight: 900;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.timer__digits {
		font-size: 1.75rem;
		font-weight: 900;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.timer--compact .timer__digits {
		font-size: 1.35rem;
	}

	.timer__unit {
		font-size: 0.65em;
		font-weight: 800;
	}

	.timer__state-text {
		font-size: 0.68rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.timer--normal .timer__state-text {
		color: var(--color-muted);
	}

	.timer__bar {
		margin-top: 0.15rem;
	}

	/* Critical shake — a single controlled pulse, not continuous */
	.timer--critical {
		animation: timer-critical-pulse 600ms ease-in-out;
	}

	@keyframes timer-critical-pulse {
		25% {
			transform: translateX(-2px);
		}
		50% {
			transform: translateX(2px);
		}
		75% {
			transform: translateX(-1px);
		}
		100% {
			transform: translateX(0);
		}
	}
</style>
