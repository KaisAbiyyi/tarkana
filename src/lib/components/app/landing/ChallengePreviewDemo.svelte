<script lang="ts">
	import Badge from '$lib/components/primitives/Badge.svelte';
	import Button from '$lib/components/primitives/Button.svelte';
	import { onMount, tick } from 'svelte';
	import { getI18nContext } from '$lib/i18n/context';
	import { formatNumber, formatPercent, formatSeconds } from '$lib/shared/presentation/format';
	const { locale, t } = getI18nContext();

	type DemoState =
		| 'idle'
		| 'prestart'
		| 'running'
		| 'correct'
		| 'incorrect'
		| 'timeout'
		| 'resetting';

	type DemoOption = {
		id: string;
		value: string;
	};

	const initialTime = 18;
	const options: DemoOption[] = [
		{ id: 'A', value: '48' },
		{ id: 'B', value: '64' },
		{ id: 'C', value: '72' },
		{ id: 'D', value: '80' }
	];

	let demoState = $state<DemoState>('idle');
	let selectedAnswer: string | null = $state(null);
	let timer = $state(initialTime);
	let progress = $state(40);
	let timerInterval: ReturnType<typeof setInterval> | undefined;
	let optionButtons = $state<HTMLButtonElement[]>([]);
	let startCardEl = $state<HTMLDivElement>();

	const answersLocked = $derived(demoState !== 'running');
	const isResult = $derived(['correct', 'incorrect', 'timeout'].includes(demoState));

	function clearTimer(): void {
		if (timerInterval !== undefined) {
			clearInterval(timerInterval);
			timerInterval = undefined;
		}
	}

	function beginTimer(): void {
		clearTimer();
		timerInterval = setInterval(() => {
			if (demoState !== 'running') {
				clearTimer();
				return;
			}

			if (timer <= 1) {
				timer = 0;
				demoState = 'timeout';
				clearTimer();
				return;
			}

			timer -= 1;
		}, 1000);
	}

	async function startDemo(): Promise<void> {
		if (demoState !== 'prestart') return;
		selectedAnswer = null;
		timer = initialTime;
		progress = 40;
		demoState = 'running';
		beginTimer();
		await tick();
		optionButtons[0]?.focus();
	}

	function selectAnswer(id: string): void {
		if (demoState !== 'running') return;
		selectedAnswer = id;
		demoState = id === 'B' ? 'correct' : 'incorrect';
		progress = 70;
		clearTimer();
	}

	async function resetDemo(): Promise<void> {
		demoState = 'resetting';
		clearTimer();
		selectedAnswer = null;
		timer = initialTime;
		progress = 40;
		await tick();
		demoState = 'prestart';
		await tick();
		startCardEl?.querySelector<HTMLButtonElement>('button')?.focus();
	}

	onMount(() => {
		demoState = 'prestart';
		return clearTimer;
	});
</script>

<section class="challenge-preview" aria-label={t('demo.aria')} data-demo-state={demoState}>
	<header class="preview-header">
		<div class="preview-heading">
			<p class="page-kicker">{t('demo.preview')}</p>
			<h2>{t('demo.questionOf', { current: 4, total: 10 })}</h2>
		</div>
		<div
			class:timer-urgent={demoState === 'running' && timer <= 5}
			class="preview-timer"
			role="timer"
			aria-label={`${t('demo.timeRemaining')} ${formatSeconds(timer, locale)}`}
		>
			<span>{t('demo.timeRemaining')}</span>
			<strong>{timer}s</strong>
		</div>
	</header>

	<div class="gameplay-panel">
		<Badge tone="accent">{t('category.number')}</Badge>
		<p class="question-copy">{t('demo.numberQuestion')}</p>

		<div class="answer-grid" role="group" aria-label={t('demo.answerChoices')}>
			{#each options as option, index (option.id)}
				<button
					bind:this={optionButtons[index]}
					type="button"
					class:answer-correct={(demoState === 'correct' && selectedAnswer === option.id) ||
						(isResult && option.id === 'B')}
					class:answer-incorrect={demoState === 'incorrect' && selectedAnswer === option.id}
					class:answer-muted={isResult && option.id !== 'B' && selectedAnswer !== option.id}
					class="answer-option"
					disabled={answersLocked}
					onclick={() => selectAnswer(option.id)}
					aria-pressed={selectedAnswer === option.id}
				>
					<span>{option.id}.</span>
					{option.value}
				</button>
			{/each}
		</div>

		<div
			class="preview-progress"
			role="progressbar"
			aria-label={t('demo.progress')}
			aria-valuemin="0"
			aria-valuemax="100"
			aria-valuenow={progress}
		>
			<div class="preview-progress-fill" style={`width: ${progress}%`}></div>
		</div>

		<div class="demo-status" aria-live="polite">
			{#if demoState === 'prestart' || demoState === 'idle' || demoState === 'resetting'}
				<div bind:this={startCardEl} class="start-card">
					<div>
						<strong>{t('demo.ready')}</strong>
						<p>{t('demo.timerStarts')}</p>
					</div>
					<Button size="sm" onclick={startDemo} disabled={demoState !== 'prestart'}
						>{t('demo.start')}</Button
					>
				</div>
			{:else if demoState === 'running'}
				<p class="running-status">
					<span aria-hidden="true">●</span>
					{t('demo.running')}
				</p>
			{:else}
				<div class="result-card" class:result-correct={demoState === 'correct'}>
					<div class="result-copy">
						<strong>
							{#if demoState === 'correct'}
								<span aria-hidden="true">✓</span> {t('result.correct')}
							{:else if demoState === 'timeout'}
								<span aria-hidden="true">◷</span> {t('demo.timeout')}
							{:else}
								<span aria-hidden="true">×</span> {t('result.wrong')}
							{/if}
						</strong>
						<p>{t('demo.explanation')}</p>
					</div>
					<div class="result-actions">
						<Button href="/auth/register" size="sm">{t('demo.playFull')}</Button>
						<button type="button" class="reset-button" onclick={resetDemo}>{t('demo.retry')}</button
						>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<div class="preview-stats" aria-label={t('demo.stats')}>
		<div class="stat-card stat-card-accent">
			<strong>{formatPercent(80, locale)}</strong>
			<span>{t('leaderboard.accuracy')}</span>
		</div>
		<div class="stat-card">
			<strong>{formatSeconds(11.2, locale)}</strong>
			<span>{t('dashboard.averageTime')}</span>
		</div>
		<div class="stat-card stat-card-lime">
			<strong>{formatNumber(4, locale)}</strong>
			<span>{t('demo.streak')}</span>
		</div>
	</div>
</section>

<style>
	.challenge-preview {
		border: 3px solid var(--color-border);
		background: white;
		padding: var(--space-3);
		box-shadow: var(--shadow-level-2);
	}

	.preview-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
	}

	.preview-heading {
		min-width: 0;
	}

	.preview-heading p,
	.preview-heading h2 {
		margin: 0;
	}

	.preview-heading h2 {
		margin-top: 0.25rem;
		font-family: var(--font-display);
		font-size: clamp(1.25rem, 3vw, 1.5rem);
		line-height: 1.2;
		font-weight: 800;
	}

	.preview-timer {
		min-width: 108px;
		border: 3px solid var(--color-border);
		background: var(--color-primary);
		padding: 0.625rem 0.75rem;
		box-shadow: var(--shadow-level-1);
		text-align: center;
	}

	.preview-timer span {
		display: block;
		font-size: 0.75rem;
		font-weight: 800;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.preview-timer strong {
		display: block;
		margin-top: 0.125rem;
		font-family: var(--font-display);
		font-size: 1.75rem;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.gameplay-panel {
		margin-top: var(--space-3);
		border: 2px solid var(--color-border);
		background: var(--color-paper);
		padding: var(--space-3);
	}

	.question-copy {
		margin: var(--space-2) 0 0;
		font-family: var(--font-display);
		font-size: clamp(1.125rem, 2.5vw, 1.45rem);
		line-height: 1.35;
		font-weight: 800;
		text-wrap: balance;
	}

	.answer-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		margin-top: var(--space-3);
	}

	.answer-option {
		min-width: 0;
		min-height: 52px;
		border: 2px solid var(--color-border);
		background: white;
		padding: 0.75rem 1rem;
		box-shadow: var(--shadow-level-1);
		font-size: 1rem;
		font-weight: 800;
		text-align: left;
		transition:
			transform 140ms ease,
			box-shadow 140ms ease,
			opacity 140ms ease;
	}

	.answer-option:disabled {
		cursor: not-allowed;
		opacity: 0.72;
	}

	.answer-option:not(:disabled):hover {
		transform: translateY(-2px);
		box-shadow: 4px 5px 0 var(--color-border);
	}

	.answer-option:not(:disabled):active {
		transform: translate(2px, 2px);
		box-shadow: 1px 1px 0 var(--color-border);
	}

	.answer-option.answer-correct {
		border-color: var(--color-border);
		background: var(--color-success);
		opacity: 1;
	}

	.answer-option.answer-incorrect {
		background: var(--color-danger);
		color: white;
		opacity: 1;
	}

	.answer-option.answer-muted {
		opacity: 0.5;
	}

	.preview-progress {
		height: 14px;
		margin-top: var(--space-3);
		border: 2px solid var(--color-border);
		background: white;
	}

	.preview-progress-fill {
		height: 100%;
		background: var(--color-accent);
		transition: width 280ms ease;
	}

	.demo-status {
		margin-top: var(--space-3);
	}

	.start-card,
	.result-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		border: 2px solid var(--color-border);
		background: color-mix(in srgb, var(--color-accent) 18%, white);
		padding: var(--space-2);
	}

	.start-card strong,
	.result-card strong {
		font-family: var(--font-display);
		font-size: 1rem;
		font-weight: 800;
	}

	.start-card p,
	.result-card p {
		margin: 0.25rem 0 0;
		font-size: 0.875rem;
		line-height: 1.45;
		color: var(--color-muted);
	}

	.running-status {
		margin: 0;
		border-left: 5px solid var(--color-accent-strong);
		background: white;
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		font-weight: 700;
	}

	.running-status span {
		color: var(--color-accent-strong);
	}

	.result-card {
		align-items: flex-start;
		background: color-mix(in srgb, var(--color-danger) 10%, white);
	}

	.result-card.result-correct {
		background: color-mix(in srgb, var(--color-success) 15%, white);
	}

	.result-copy {
		min-width: 0;
	}

	.result-actions {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		gap: var(--space-1);
	}

	.reset-button {
		min-height: 44px;
		padding: 0.5rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 700;
		text-decoration: underline;
		text-decoration-thickness: 2px;
		text-underline-offset: 3px;
	}

	.preview-stats {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
		margin-top: var(--space-2);
	}

	.stat-card {
		min-width: 0;
		border: 2px solid var(--color-border);
		background: white;
		padding: 0.875rem;
	}

	.stat-card-accent {
		background: var(--color-accent);
	}

	.stat-card-lime {
		background: var(--color-lime);
	}

	.stat-card strong,
	.stat-card span {
		display: block;
	}

	.stat-card strong {
		font-family: var(--font-display);
		font-size: clamp(1.25rem, 3vw, 1.75rem);
		line-height: 1;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}

	.stat-card span {
		margin-top: 0.5rem;
		font-size: 0.75rem;
		line-height: 1.25;
		font-weight: 800;
		letter-spacing: 0.035em;
		text-transform: uppercase;
	}

	@media (max-width: 560px) {
		.challenge-preview {
			padding: var(--space-2);
		}

		.gameplay-panel {
			margin-top: var(--space-2);
			padding: var(--space-2);
		}

		.preview-timer {
			min-width: 92px;
			padding-inline: 0.5rem;
		}

		.answer-grid {
			gap: 0.625rem;
			margin-top: var(--space-2);
		}

		.answer-option {
			min-height: 48px;
			padding: 0.625rem 0.75rem;
		}

		.start-card,
		.result-card {
			align-items: stretch;
			flex-direction: column;
		}

		.result-actions {
			align-items: stretch;
			flex-direction: column;
		}

		.stat-card {
			padding: 0.75rem 0.5rem;
		}
	}

	@media (max-width: 350px) {
		.preview-heading h2 {
			font-size: 1.125rem;
		}

		.preview-timer {
			min-width: 84px;
		}

		.preview-stats {
			gap: 0.5rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.answer-option,
		.preview-progress-fill {
			transition: none;
		}

		.answer-option:not(:disabled):hover,
		.answer-option:not(:disabled):active {
			transform: none;
		}
	}
</style>
