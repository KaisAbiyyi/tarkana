<script lang="ts">
	import type { QuestionType } from '$lib/shared/constants/challenge';
	import type { FeedbackStatus } from '$lib/components/challenge/AnswerFeedback.svelte';
	import SymbolGlyph from '$lib/components/challenge/SymbolGlyph.svelte';
	import { isVisualSymbolToken, labelSymbolToken } from '$lib/shared/presentation/symbols';
	import { createArenaLabels } from '$lib/shared/presentation/arena-labels';
	import { getI18nContext } from '$lib/i18n/context';

	type Props = {
		choices: string[];
		selectedAnswer: string;
		questionType?: QuestionType;
		disabled?: boolean;
		locked?: boolean;
		feedbackStatus?: FeedbackStatus | null;
		correctAnswer?: string;
		timedOut?: boolean;
		onSelect: (choice: string) => void;
	};

	let {
		choices,
		selectedAnswer,
		questionType,
		disabled = false,
		locked = false,
		feedbackStatus = null,
		timedOut = false,
		onSelect
	}: Props = $props();
	const { locale, t } = getI18nContext();
	const ARENA_LABELS = createArenaLabels(locale);

	const LETTER_KEYS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

	function getCardState(
		choice: string
	): 'default' | 'selected' | 'locked' | 'correct' | 'incorrect' | 'timeout' | 'disabled' {
		const isSelected = selectedAnswer === choice;

		if (timedOut) return 'timeout';
		if (feedbackStatus === 'correct' && isSelected) return 'correct';
		if (feedbackStatus === 'incorrect' && isSelected) return 'incorrect';
		if (locked && isSelected) return 'locked';
		if (locked) return 'disabled';
		if (isSelected) return 'selected';
		if (disabled) return 'disabled';
		return 'default';
	}

	function handleKeydown(event: KeyboardEvent): void {
		const key = event.key.toLowerCase();
		const letterIndex = LETTER_KEYS.indexOf(key);

		if (letterIndex >= 0 && letterIndex < choices.length && !locked && !disabled && !timedOut) {
			event.preventDefault();
			onSelect(choices[letterIndex]);
		}
	}

	function translateChoice(choice: string): string {
		const lowered = choice.toLowerCase().trim();
		if (lowered === 'cannot be determined') return t('arena.cannotDetermine');
		if (lowered === 'all of the above') return t('arena.allAbove');
		if (lowered === 'none of the above') return t('arena.noneAbove');
		if (questionType === 'memory_pattern') {
			return choice
				.split(' > ')
				.map((token) => labelSymbolToken(token, locale))
				.join(' > ');
		}
		return choice;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="choice-grid"
	class:choice-grid--symbol={questionType === 'symbol_pattern'}
	role="radiogroup"
	aria-label={ARENA_LABELS.answerChoicesLabel}
>
	{#each choices as choice, index (choice)}
		{@const state = getCardState(choice)}
		{@const isSelected = selectedAnswer === choice}
		{@const visualSymbol = questionType === 'symbol_pattern' && isVisualSymbolToken(choice)}
		{@const letter = String.fromCharCode(65 + index)}
		<button
			type="button"
			class="answer-card answer-card--{state}"
			disabled={locked || (disabled && !isSelected) || timedOut}
			role="radio"
			aria-checked={isSelected}
			aria-label={visualSymbol
				? `${letter}. ${labelSymbolToken(choice, locale)}`
				: `${letter}. ${choice}`}
			id={`answer-${index}`}
			onclick={() => onSelect(choice)}
		>
			<span class="answer-card__content" class:answer-card__content--symbol={visualSymbol}>
				<span class="answer-card__marker" class:answer-card__marker--active={isSelected}>
					{#if state === 'correct'}
						<span class="answer-card__check" aria-hidden="true">✓</span>
					{:else if state === 'incorrect'}
						<span class="answer-card__cross" aria-hidden="true">✕</span>
					{:else}
						{letter}
					{/if}
				</span>
				{#if visualSymbol}
					<SymbolGlyph token={choice} size="md" />
					<span class="sr-only">{labelSymbolToken(choice, locale)}</span>
				{:else}
					<span class="answer-card__text">{translateChoice(choice)}</span>
				{/if}
			</span>

			{#if isSelected && state !== 'correct' && state !== 'incorrect'}
				<span class="answer-card__indicator" aria-hidden="true">
					<svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
						<path
							d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
						/>
					</svg>
				</span>
			{/if}
		</button>
	{/each}
</div>

<style>
	.choice-grid {
		display: grid;
		gap: 0.65rem;
	}

	.choice-grid--symbol {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.answer-card {
		position: relative;
		display: flex;
		align-items: center;
		min-height: 3.5rem;
		padding: 0.75rem 1rem;
		border: 3px solid var(--color-border);
		background: var(--color-surface);
		box-shadow: var(--shadow-hard-sm);
		text-align: left;
		font-weight: 800;
		cursor: pointer;
		transition:
			transform 140ms ease,
			box-shadow 140ms ease,
			background-color 140ms ease,
			border-width 140ms ease;
	}

	/* Hover */
	.answer-card--default:hover {
		transform: translateY(-3px);
		box-shadow: 5px 7px 0 var(--color-border);
		background: var(--color-paper);
	}

	/* Focus-visible */
	.answer-card:focus-visible {
		outline: 4px solid var(--color-accent);
		outline-offset: 3px;
	}

	/* Pressed / active */
	.answer-card--default:active {
		transform: translate(3px, 3px);
		box-shadow: 1px 1px 0 var(--color-border);
	}

	/* Selected */
	.answer-card--selected {
		background: var(--color-accent);
		border-width: 4px;
		box-shadow: 5px 5px 0 var(--color-border);
		animation: choice-select 260ms cubic-bezier(0.2, 1.4, 0.4, 1);
	}

	/* Locked (selected during submission) */
	.answer-card--locked {
		background: var(--color-accent);
		border-width: 4px;
		box-shadow: var(--shadow-hard-sm);
		cursor: not-allowed;
		opacity: 0.9;
	}

	/* Correct */
	.answer-card--correct {
		background: var(--color-success);
		border-width: 4px;
		box-shadow: 5px 5px 0 var(--color-border);
		animation: choice-correct 350ms cubic-bezier(0.2, 1.35, 0.4, 1);
	}

	/* Incorrect */
	.answer-card--incorrect {
		background: var(--color-danger);
		color: white;
		border-width: 4px;
		box-shadow: var(--shadow-hard-sm);
		animation: choice-incorrect 350ms ease;
	}

	/* Timeout */
	.answer-card--timeout {
		background: var(--color-paper);
		opacity: 0.55;
		cursor: not-allowed;
		box-shadow: none;
	}

	/* Disabled */
	.answer-card--disabled {
		background: var(--game-choice-disabled, #e4ddd2);
		opacity: 0.6;
		cursor: not-allowed;
		box-shadow: none;
	}

	/* Content */
	.answer-card__content {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		width: 100%;
	}

	.answer-card__content--symbol {
		justify-content: center;
		padding-right: 2rem;
	}

	/* Marker (A/B/C/D) */
	.answer-card__marker {
		display: inline-flex;
		width: 2.25rem;
		height: 2.25rem;
		flex: 0 0 auto;
		align-items: center;
		justify-content: center;
		border: 2px solid var(--color-border);
		background: var(--color-primary);
		font-size: 0.85rem;
		font-weight: 900;
		transition:
			background-color 140ms ease,
			transform 140ms ease;
	}

	.answer-card__marker--active {
		background: var(--color-surface);
		transform: scale(1.05);
	}

	.answer-card--correct .answer-card__marker {
		background: white;
		color: var(--color-ink);
	}

	.answer-card--incorrect .answer-card__marker {
		background: white;
		color: var(--color-danger);
	}

	.answer-card__check {
		font-size: 1rem;
		color: var(--color-success);
	}

	.answer-card__cross {
		font-size: 1rem;
		color: var(--color-danger);
	}

	.answer-card__text {
		font-weight: 800;
		line-height: 1.3;
	}

	/* Selected indicator (top-right check) */
	.answer-card__indicator {
		position: absolute;
		top: 0.45rem;
		right: 0.45rem;
		display: flex;
		width: 1.6rem;
		height: 1.6rem;
		align-items: center;
		justify-content: center;
		border: 2px solid var(--color-border);
		border-radius: 999px;
		background: white;
		animation: indicator-pop 200ms cubic-bezier(0.2, 1.6, 0.4, 1);
	}

	@keyframes choice-select {
		50% {
			transform: scale(1.025);
		}
	}

	@keyframes choice-correct {
		40% {
			transform: scale(1.03) rotate(-1deg);
		}
	}

	@keyframes choice-incorrect {
		20%,
		60% {
			transform: translateX(-4px);
		}
		40%,
		80% {
			transform: translateX(4px);
		}
	}

	@keyframes indicator-pop {
		from {
			transform: scale(0);
			opacity: 0;
		}
	}

	@media (max-width: 520px) {
		.choice-grid--symbol {
			grid-template-columns: 1fr;
		}

		.answer-card {
			min-height: 3rem;
			padding: 0.6rem 0.75rem;
		}

		.answer-card__marker {
			width: 2rem;
			height: 2rem;
			font-size: 0.78rem;
		}
	}
</style>
