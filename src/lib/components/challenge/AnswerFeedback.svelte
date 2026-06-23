<script lang="ts">
	import { createArenaLabels } from '$lib/shared/presentation/arena-labels';
	import { getI18nContext } from '$lib/i18n/context';

	export type FeedbackStatus = 'correct' | 'incorrect' | 'complete' | 'timeout';

	type Props = {
		status: FeedbackStatus;
		scoreEarned?: number;
	};

	let { status, scoreEarned = 0 }: Props = $props();
	const { locale } = getI18nContext();
	const ARENA_LABELS = createArenaLabels(locale);

	const content: Record<FeedbackStatus, { title: string; message: string; icon: string }> = {
		correct: {
			title: ARENA_LABELS.correctTitle,
			message: ARENA_LABELS.correctMessage,
			icon: '✓'
		},
		incorrect: {
			title: ARENA_LABELS.incorrectTitle,
			message: ARENA_LABELS.incorrectMessage,
			icon: '✕'
		},
		timeout: {
			title: ARENA_LABELS.timeoutTitle,
			message: ARENA_LABELS.timeoutMessage,
			icon: '◷'
		},
		complete: {
			title: ARENA_LABELS.completeTitle,
			message: ARENA_LABELS.completeMessage,
			icon: '★'
		}
	};

	let current = $derived(content[status]);

	const burstPieces = [0, 1, 2, 3, 4, 5, 6, 7];

	let toneClass = $derived(
		status === 'correct'
			? 'bg-[var(--color-success)]'
			: status === 'incorrect' || status === 'timeout'
				? 'bg-[var(--color-primary)]'
				: 'bg-[var(--color-info)]'
	);
</script>

<div
	class={`answer-feedback relative overflow-hidden border-[3px] border-[var(--color-border)] p-4 shadow-[var(--shadow-hard-sm)] ${toneClass}`}
	role="status"
	aria-live="polite"
>
	{#if status === 'complete'}
		<div class="completion-burst" aria-hidden="true">
			{#each burstPieces as index (index)}
				<span style={`--burst-index: ${index}`}></span>
			{/each}
		</div>
	{/if}
	<div class="relative flex items-center gap-4">
		<span
			class="feedback-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[3px] border-[var(--color-border)] bg-white text-2xl font-black"
			aria-hidden="true"
		>
			{current.icon}
		</span>
		<div>
			<p class="text-xl font-black">{current.title}</p>
			<p class="font-bold">{current.message}</p>
			{#if status === 'correct'}
				<p class="score-float mt-1 font-black">{ARENA_LABELS.scoreEarned(scoreEarned)}</p>
			{/if}
		</div>
	</div>
</div>
