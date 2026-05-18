<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';
	import type { ApiResponse } from '$lib/shared/types/api';
	import type { ChallengeType, QuestionType } from '$lib/shared/constants/challenge';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import Button from '$lib/components/primitives/Button.svelte';
	import Card from '$lib/components/primitives/Card.svelte';
	import ChallengeTimer from '$lib/components/challenge/ChallengeTimer.svelte';
	import ChoiceList from '$lib/components/challenge/ChoiceList.svelte';
	import MemoryRevealPanel from '$lib/components/challenge/MemoryRevealPanel.svelte';
	import QuestionPanel from '$lib/components/challenge/QuestionPanel.svelte';
	import { labelQuestionType } from '$lib/shared/presentation/format';

	type ActiveQuestionDto = {
		sessionQuestionId: string;
		categoryId: string;
		questionType: QuestionType;
		prompt: string;
		choices: string[];
		difficultyScore: number;
		timeLimitSeconds: number;
		metadata: Record<string, unknown>;
		generatedSeed: string;
		orderIndex: number;
	};

	type StartChallengeResult = {
		sessionId: string;
		totalQuestions: number;
		currentQuestion: ActiveQuestionDto;
	};

	type SubmitAnswerResult = {
		isCorrect: boolean;
		scoreEarned: number;
		isComplete: boolean;
		nextQuestion: ActiveQuestionDto | null;
	};

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();
	let selectedMode = $state<QuestionType | ''>('');
	let challengeType = $state<ChallengeType>('standard');
	let sessionId = $state('');
	let totalQuestions = $state(0);
	let currentQuestion = $state<ActiveQuestionDto | null>(null);
	let selectedAnswer = $state('');
	let remainingSeconds = $state(0);
	let startedAtMs = $state<number | null>(null);
	let loading = $state(false);
	let errorMessage = $state<string | null>(null);
	let feedback = $state<string | null>(null);
	let revealVisible = $state(false);
	let tabSwitchCount = 0;

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const mode = params.get('mode');
		if (data.questionTypes.includes(mode as QuestionType)) selectedMode = mode as QuestionType;

		const onVisibilityChange = () => {
			if (document.hidden && currentQuestion) tabSwitchCount += 1;
		};
		document.addEventListener('visibilitychange', onVisibilityChange);
		return () => document.removeEventListener('visibilitychange', onVisibilityChange);
	});

	$effect(() => {
		const activeQuestion = currentQuestion;
		if (!activeQuestion) return;

		selectedAnswer = '';
		feedback = null;
		errorMessage = null;
		remainingSeconds = activeQuestion.timeLimitSeconds;
		startedAtMs = Date.now();
		revealVisible = activeQuestion.questionType === 'memory_pattern';

		const revealSeconds =
			typeof activeQuestion.metadata.revealSeconds === 'number'
				? activeQuestion.metadata.revealSeconds
				: 4;
		const revealTimeout =
			activeQuestion.questionType === 'memory_pattern'
				? window.setTimeout(() => {
						revealVisible = false;
					}, revealSeconds * 1000)
				: undefined;
		const timer = window.setInterval(() => {
			if (startedAtMs === null) return;
			const elapsed = Math.floor((Date.now() - startedAtMs) / 1000);
			remainingSeconds = Math.max(0, activeQuestion.timeLimitSeconds - elapsed);
		}, 250);

		return () => {
			window.clearInterval(timer);
			if (revealTimeout) window.clearTimeout(revealTimeout);
		};
	});

	let canSubmit = $derived(
		Boolean(currentQuestion) && !loading && (selectedAnswer.length > 0 || remainingSeconds <= 0)
	);

	async function startChallenge(): Promise<void> {
		loading = true;
		errorMessage = null;
		feedback = null;

		const response = await fetch('/api/challenge/start', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				challengeType: selectedMode ? 'mode' : challengeType,
				selectedMode: selectedMode || undefined
			})
		});
		const payload = (await response.json()) as ApiResponse<StartChallengeResult>;
		loading = false;

		if (!payload.ok) {
			errorMessage = payload.error.message;
			return;
		}

		sessionId = payload.data.sessionId;
		totalQuestions = payload.data.totalQuestions;
		currentQuestion = payload.data.currentQuestion;
	}

	async function submitAnswer(): Promise<void> {
		if (!currentQuestion || !canSubmit) return;

		loading = true;
		errorMessage = null;
		const timeSpentSeconds =
			startedAtMs === null
				? currentQuestion.timeLimitSeconds
				: Math.min(
						currentQuestion.timeLimitSeconds,
						Math.max(0, Math.ceil((Date.now() - startedAtMs) / 1000))
					);
		const selected = selectedAnswer || 'Time expired';

		const response = await fetch('/api/challenge/submit', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				sessionId,
				sessionQuestionId: currentQuestion.sessionQuestionId,
				selectedAnswer: selected,
				timeSpentSeconds
			})
		});
		const payload = (await response.json()) as ApiResponse<SubmitAnswerResult>;
		loading = false;

		if (!payload.ok) {
			errorMessage = payload.error.message;
			return;
		}

		feedback = payload.data.isCorrect
			? `Correct. Reasoning Score +${payload.data.scoreEarned}`
			: 'Not correct. Continue to the next question.';

		if (payload.data.isComplete) {
			await finishChallenge();
			return;
		}

		currentQuestion = payload.data.nextQuestion;
	}

	async function finishChallenge(): Promise<void> {
		const response = await fetch('/api/challenge/finish', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ sessionId, tabSwitchCount })
		});
		const payload = (await response.json()) as ApiResponse<{ sessionId: string }>;

		if (!payload.ok) {
			errorMessage = payload.error.message;
			return;
		}

		await goto(resolve(`/result/${sessionId}`));
	}
</script>

<section class="grid gap-8">
	<header>
		<p class="font-black text-[var(--color-muted)] uppercase">Ranked flow</p>
		<h1 class="text-4xl font-black sm:text-5xl">Challenge Session</h1>
		<p class="mt-2 max-w-2xl font-semibold text-[var(--color-muted)]">
			Jawab satu per satu. Ranked mode tidak menyediakan navigasi kembali ke soal sebelumnya.
		</p>
	</header>

	{#if !currentQuestion}
		<Card title="Start Challenge" description="Pilih tipe session dan mode opsional.">
			<div class="grid gap-5">
				<label class="grid gap-2 font-black">
					Challenge type
					<select
						class="min-h-12 border-[3px] border-[var(--color-border)] bg-white px-4 font-bold shadow-[var(--shadow-hard-sm)]"
						bind:value={challengeType}
						disabled={Boolean(selectedMode)}
					>
						<option value="quick">Quick Challenge</option>
						<option value="standard">Standard Challenge</option>
						<option value="long">Long Challenge</option>
						<option value="mixed">Mixed Challenge</option>
					</select>
				</label>

				<div class="grid gap-3">
					<p class="font-black uppercase">Mode selection</p>
					<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						<button
							type="button"
							class={`border-[3px] border-[var(--color-border)] p-4 text-left font-black shadow-[var(--shadow-hard-sm)] ${selectedMode === '' ? 'bg-[var(--color-accent)]' : 'bg-white'}`}
							onclick={() => (selectedMode = '')}
						>
							Mixed modes
						</button>
						{#each data.questionTypes as mode (mode)}
							<button
								type="button"
								class={`border-[3px] border-[var(--color-border)] p-4 text-left font-black shadow-[var(--shadow-hard-sm)] ${selectedMode === mode ? 'bg-[var(--color-accent)]' : 'bg-white'}`}
								onclick={() => (selectedMode = mode)}
							>
								{labelQuestionType(mode)}
							</button>
						{/each}
					</div>
				</div>

				{#if errorMessage}
					<p
						class="border-2 border-[var(--color-border)] bg-[var(--color-danger)] p-3 font-bold text-white"
					>
						{errorMessage}
					</p>
				{/if}

				<Button onclick={startChallenge} {loading}>Start Challenge</Button>
			</div>
		</Card>
	{:else}
		<div class="grid gap-5 lg:grid-cols-[1fr_320px]">
			<div class="grid gap-5">
				<QuestionPanel question={currentQuestion} {totalQuestions} />

				{#if currentQuestion.questionType === 'memory_pattern'}
					<MemoryRevealPanel metadata={currentQuestion.metadata} visible={revealVisible} />
				{/if}

				<ChoiceList
					choices={currentQuestion.choices}
					{selectedAnswer}
					disabled={loading}
					onSelect={(choice) => (selectedAnswer = choice)}
				/>

				{#if feedback}
					<p class="border-2 border-[var(--color-border)] bg-[var(--color-info)] p-3 font-bold">
						{feedback}
					</p>
				{/if}
				{#if errorMessage}
					<p
						class="border-2 border-[var(--color-border)] bg-[var(--color-danger)] p-3 font-bold text-white"
					>
						{errorMessage}
					</p>
				{/if}

				<Button onclick={submitAnswer} disabled={!canSubmit} {loading}>
					{remainingSeconds <= 0 && !selectedAnswer ? 'Submit Expired Answer' : 'Submit Answer'}
				</Button>
			</div>

			<aside class="grid content-start gap-4">
				<ChallengeTimer {remainingSeconds} totalSeconds={currentQuestion.timeLimitSeconds} />
				<Card title="Session Rules">
					<div class="grid gap-3 text-sm font-bold">
						<Badge tone="warning">No previous navigation</Badge>
						<p>Score, correctness, rating, and rank are computed server-side.</p>
						<p>Correct answers appear only after the session result is completed.</p>
					</div>
				</Card>
			</aside>
		</div>
	{/if}
</section>
