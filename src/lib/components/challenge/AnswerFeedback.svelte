<script lang="ts">
	export type FeedbackStatus = 'correct' | 'incorrect' | 'complete';

	type Props = {
		status: FeedbackStatus;
		scoreEarned?: number;
	};

	let { status, scoreEarned = 0 }: Props = $props();

	const content: Record<FeedbackStatus, { title: string; message: string; icon: string }> = {
		correct: {
			title: 'Correct!',
			message: 'Sharp reasoning. Keep the streak alive.',
			icon: '✓'
		},
		incorrect: {
			title: 'Keep going!',
			message: 'One miss does not end the run. Reset and solve the next one.',
			icon: '↻'
		},
		complete: {
			title: 'Challenge complete!',
			message: 'Calculating your Reasoning Score and Rank Progress.',
			icon: '★'
		}
	};
	const burstPieces = [0, 1, 2, 3, 4, 5, 6, 7];

	let current = $derived(content[status]);
	let toneClass = $derived(
		status === 'correct'
			? 'bg-[var(--color-success)]'
			: status === 'incorrect'
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
				<p class="score-float mt-1 font-black">+{scoreEarned} Reasoning Score</p>
			{/if}
		</div>
	</div>
</div>
