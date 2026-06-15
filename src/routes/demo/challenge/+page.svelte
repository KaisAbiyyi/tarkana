<script lang="ts">
	import AnswerFeedback from '$lib/components/challenge/AnswerFeedback.svelte';
	import ChoiceList from '$lib/components/challenge/ChoiceList.svelte';
	import QuestionPanel from '$lib/components/challenge/QuestionPanel.svelte';
	import SessionMomentum from '$lib/components/challenge/SessionMomentum.svelte';
	import ChallengeTimer from '$lib/components/challenge/ChallengeTimer.svelte';
	import Button from '$lib/components/primitives/Button.svelte';

	const question = {
		questionType: 'symbol_pattern' as const,
		prompt:
			'Find the next symbol: triangle-left | triangle-up | triangle-right | triangle-down | triangle-left | ?',
		difficultyScore: 130,
		orderIndex: 1
	};

	const choices = ['triangle-up', 'triangle-right', 'triangle-down', 'triangle-left'];
	let selectedAnswer = $state('');
	let showFeedback = $state(false);
</script>

<svelte:head>
	<title>Challenge Visual QA</title>
</svelte:head>

<main class="page-shell grid min-h-screen content-start gap-6 py-8">
	<header>
		<p class="font-black text-[var(--color-muted)] uppercase">Development visual QA</p>
		<h1 class="text-3xl font-black sm:text-4xl">Playful Challenge Preview</h1>
	</header>

	<div class="grid gap-5 lg:grid-cols-[1fr_300px]">
		<section class="grid gap-5">
			<SessionMomentum currentQuestion={2} totalQuestions={5} streak={2} sessionScore={260} />
			<QuestionPanel {question} totalQuestions={5} />
			<ChoiceList
				{choices}
				{selectedAnswer}
				questionType="symbol_pattern"
				disabled={showFeedback}
				onSelect={(choice) => {
					selectedAnswer = choice;
				}}
			/>
			{#if showFeedback}
				<AnswerFeedback status="correct" scoreEarned={130} />
			{/if}
			<Button
				disabled={!selectedAnswer || showFeedback}
				onclick={() => {
					showFeedback = true;
				}}
			>
				Check Answer
			</Button>
		</section>

		<aside class="grid content-start gap-4">
			<ChallengeTimer remainingSeconds={18} totalSeconds={25} />
			<div
				class="border-[3px] border-[var(--color-border)] bg-[var(--color-primary)] p-4 font-bold shadow-[var(--shadow-hard-sm)]"
			>
				This fixture is available only during development and uses production challenge components.
			</div>
		</aside>
	</div>
</main>
