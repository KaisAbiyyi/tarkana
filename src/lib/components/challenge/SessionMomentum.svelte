<script lang="ts">
	import ProgressBar from '$lib/components/primitives/ProgressBar.svelte';

	type Props = {
		currentQuestion: number;
		totalQuestions: number;
		streak: number;
		sessionScore: number;
	};

	let { currentQuestion, totalQuestions, streak, sessionScore }: Props = $props();
</script>

<section
	class="momentum-strip grid gap-3 border-[3px] border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-hard-sm)]"
	aria-label="Session momentum"
>
	<div class="grid grid-cols-3 gap-2 text-center">
		<div>
			<p class="text-xs font-black text-[var(--color-muted)] uppercase">Progress</p>
			<p class="font-black">{currentQuestion} of {totalQuestions}</p>
		</div>
		<div class={streak > 1 ? 'streak-pop' : ''}>
			<p class="text-xs font-black text-[var(--color-muted)] uppercase">On fire</p>
			<p class="font-black">🔥 {streak} streak</p>
		</div>
		<div class={sessionScore > 0 ? 'score-pop' : ''}>
			<p class="text-xs font-black text-[var(--color-muted)] uppercase">Score</p>
			<p class="font-black">{sessionScore} pts</p>
		</div>
	</div>
	<ProgressBar
		value={currentQuestion}
		max={totalQuestions}
		label="Challenge progress"
		tone="accent"
		compact
	/>
</section>
