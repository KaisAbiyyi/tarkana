<script lang="ts">
	import Badge from '$lib/components/primitives/Badge.svelte';
	import { formatSeconds, labelQuestionType } from '$lib/shared/presentation/format';

	type ReviewItem = {
		sessionQuestionId: string;
		questionType: string;
		prompt: string;
		correctAnswer: string;
		explanation: string;
		selectedAnswer: string | null;
		isCorrect: boolean;
		timeSpentSeconds: number;
		scoreEarned: number;
		orderIndex: number;
	};

	type Props = {
		review: ReviewItem[];
	};

	let { review }: Props = $props();
</script>

<div class="grid gap-4">
	{#each review as item (item.sessionQuestionId)}
		<article
			class="border-[3px] border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-hard-sm)]"
		>
			<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
				<div class="flex flex-wrap gap-2">
					<Badge tone={item.isCorrect ? 'success' : 'danger'}>
						{item.isCorrect ? 'Correct' : 'Wrong'}
					</Badge>
					<Badge tone="accent">{labelQuestionType(item.questionType)}</Badge>
				</div>
				<p class="text-sm font-black">Question {item.orderIndex + 1}</p>
			</div>

			<h2 class="text-lg font-black">{item.prompt}</h2>
			<dl class="mt-4 grid gap-3 sm:grid-cols-3">
				<div>
					<dt class="text-xs font-black text-[var(--color-muted)] uppercase">Your answer</dt>
					<dd class="font-bold">{item.selectedAnswer ?? 'No answer'}</dd>
				</div>
				<div>
					<dt class="text-xs font-black text-[var(--color-muted)] uppercase">Correct answer</dt>
					<dd class="font-bold">{item.correctAnswer}</dd>
				</div>
				<div>
					<dt class="text-xs font-black text-[var(--color-muted)] uppercase">Score / time</dt>
					<dd class="font-bold">{item.scoreEarned} pts, {formatSeconds(item.timeSpentSeconds)}</dd>
				</div>
			</dl>
			<p
				class="mt-4 border-l-[4px] border-[var(--color-border)] bg-[var(--color-paper)] p-3 font-semibold"
			>
				{item.explanation}
			</p>
		</article>
	{/each}
</div>
