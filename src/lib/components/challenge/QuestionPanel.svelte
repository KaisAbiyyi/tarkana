<script lang="ts">
	import type { QuestionType } from '$lib/shared/constants/challenge';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import { labelQuestionType } from '$lib/shared/presentation/format';

	type ActiveQuestion = {
		questionType: QuestionType;
		prompt: string;
		difficultyScore: number;
		orderIndex: number;
	};

	type Props = {
		question: ActiveQuestion;
		totalQuestions: number;
	};

	let { question, totalQuestions }: Props = $props();
</script>

<section class="border-[3px] border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-hard)]">
	<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
		<div class="flex flex-wrap gap-2">
			<Badge tone="accent">{labelQuestionType(question.questionType)}</Badge>
			<Badge tone="warning">Difficulty {question.difficultyScore}</Badge>
		</div>
		<p class="font-black">
			Question {question.orderIndex + 1}/{totalQuestions}
		</p>
	</div>

	<h1 class="text-2xl leading-tight font-black sm:text-3xl">{question.prompt}</h1>
</section>
