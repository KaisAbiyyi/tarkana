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
	import AnswerFeedback, {
		type FeedbackStatus
	} from '$lib/components/challenge/AnswerFeedback.svelte';
	import ChallengeTimer from '$lib/components/challenge/ChallengeTimer.svelte';
	import ChoiceList from '$lib/components/challenge/ChoiceList.svelte';
	import MemoryRevealPanel from '$lib/components/challenge/MemoryRevealPanel.svelte';
	import QuestionPanel from '$lib/components/challenge/QuestionPanel.svelte';
	import SessionMomentum from '$lib/components/challenge/SessionMomentum.svelte';
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
	let transitioning = $state(false);
	let errorMessage = $state<string | null>(null);
	let feedbackStatus = $state<FeedbackStatus | null>(null);
	let feedbackScore = $state(0);
	let streak = $state(0);
	let sessionScore = $state(0);
	let revealVisible = $state(false);
	let tabSwitchCount = 0;

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const mode = params.get('mode');
		if (data.questionTypes.includes(mode as QuestionType)) {
			selectedMode = mode as QuestionType;
			challengeType = 'mode';
		}

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
		feedbackStatus = null;
		feedbackScore = 0;
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
		Boolean(currentQuestion) &&
			!loading &&
			!transitioning &&
			feedbackStatus === null &&
			(selectedAnswer.length > 0 || remainingSeconds <= 0)
	);

	async function startChallenge(): Promise<void> {
		loading = true;
		errorMessage = null;
		feedbackStatus = null;
		feedbackScore = 0;
		streak = 0;
		sessionScore = 0;
		const effectiveChallengeType = selectedMode
			? 'mode'
			: challengeType === 'mode'
				? 'mixed'
				: challengeType;

		const response = await fetch('/api/challenge/start', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				challengeType: effectiveChallengeType,
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

		feedbackStatus = payload.data.isCorrect ? 'correct' : 'incorrect';
		feedbackScore = payload.data.scoreEarned;
		sessionScore += payload.data.scoreEarned;
		streak = payload.data.isCorrect ? streak + 1 : 0;
		transitioning = true;

		if (payload.data.isComplete) {
			feedbackStatus = 'complete';
			await waitForFeedback();
			await finishChallenge();
			return;
		}

		await waitForFeedback();
		currentQuestion = payload.data.nextQuestion;
		transitioning = false;
	}

	async function finishChallenge(): Promise<void> {
		loading = true;
		const response = await fetch('/api/challenge/finish', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ sessionId, tabSwitchCount })
		});
		const payload = (await response.json()) as ApiResponse<{ sessionId: string }>;
		loading = false;

		if (!payload.ok) {
			errorMessage = payload.error.message;
			transitioning = false;
			return;
		}

		await goto(resolve(`/result/${sessionId}`));
	}

	function waitForFeedback(): Promise<void> {
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		return new Promise((resolveDelay) => window.setTimeout(resolveDelay, reducedMotion ? 0 : 650));
	}

	function selectChallengeType(event: Event): void {
		const nextType = (event.currentTarget as HTMLSelectElement).value as ChallengeType;
		challengeType = nextType;
		if (nextType === 'mode' && !selectedMode) selectedMode = data.questionTypes[0] ?? '';
		if (nextType !== 'mode') selectedMode = '';
	}

	function selectMode(mode: QuestionType | ''): void {
		selectedMode = mode;
		challengeType = mode ? 'mode' : 'mixed';
	}
</script>

<svelte:head>
	<title>Challenge | Tarkana</title>
</svelte:head>

<section class="grid gap-8">
	<header class="grid gap-4 lg:grid-cols-[1fr_340px] lg:items-end">
		<div>
			<p class="page-kicker">Ranked flow</p>
			<h1 class="page-title">Challenge Session</h1>
			<p class="mt-3 max-w-2xl text-lg font-semibold text-[var(--color-muted)]">
				Jawab satu per satu. Ranked mode tidak menyediakan navigasi kembali ke soal sebelumnya.
			</p>
		</div>
		<div
			class="border-[3px] border-[var(--color-border)] bg-[var(--color-primary)] p-4 shadow-[var(--shadow-hard-sm)]"
		>
			<p class="text-sm font-black uppercase">Server trust boundary</p>
			<p class="mt-1 text-sm font-bold">
				Score, correctness, elapsed time, rating, and rank are validated server-side.
			</p>
		</div>
	</header>

	{#if !currentQuestion}
		<div class="grid gap-5 lg:grid-cols-[1fr_320px]">
			<Card title="Start Challenge" description="Pilih tipe session dan mode opsional.">
				<div class="grid gap-5">
					<label class="grid gap-2 font-black">
						Challenge type
						<select
							class="min-h-12 border-[3px] border-[var(--color-border)] bg-white px-4 font-bold shadow-[var(--shadow-hard-sm)]"
							bind:value={challengeType}
							onchange={selectChallengeType}
						>
							<option value="quick">Quick Challenge</option>
							<option value="standard">Standard Challenge</option>
							<option value="long">Long Challenge</option>
							<option value="mixed">Mixed Challenge</option>
							<option value="mode">Mode Challenge</option>
						</select>
					</label>

					<div class="grid gap-3">
						<p class="font-black uppercase">Mode selection</p>
						<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
							<button
								type="button"
								class={`choice-surface min-h-20 p-4 text-left font-black ${selectedMode === '' ? 'bg-[var(--color-accent)]' : 'bg-white'}`}
								onclick={() => selectMode('')}
							>
								<span class="block text-lg">Mixed modes</span>
								<span class="block text-sm font-bold text-[var(--color-muted)]"
									>All active categories</span
								>
							</button>
							{#each data.questionTypes as mode (mode)}
								<button
									type="button"
									class={`choice-surface min-h-20 p-4 text-left font-black ${selectedMode === mode ? 'bg-[var(--color-accent)]' : 'bg-white'}`}
									onclick={() => selectMode(mode)}
								>
									<span class="block text-lg">{labelQuestionType(mode)}</span>
									<span class="block text-sm font-bold text-[var(--color-muted)]"
										>Focused session</span
									>
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

			<aside class="grid content-start gap-4">
				<div
					class="border-[3px] border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-hard)]"
				>
					<p class="text-sm font-black uppercase">Ranked rules</p>
					<ul class="mt-4 grid gap-3 text-sm font-bold">
						<li class="border-l-[5px] border-[var(--color-accent)] bg-[var(--color-paper)] p-3">
							One answer per question.
						</li>
						<li class="border-l-[5px] border-[var(--color-primary)] bg-[var(--color-paper)] p-3">
							Timer remains visible while solving.
						</li>
						<li class="border-l-[5px] border-[var(--color-danger)] bg-[var(--color-paper)] p-3">
							Correct answers unlock only after result review.
						</li>
					</ul>
				</div>
			</aside>
		</div>
	{:else}
		<div class="grid gap-5 lg:grid-cols-[1fr_320px]">
			<div class="grid gap-5">
				<SessionMomentum
					currentQuestion={currentQuestion.orderIndex + 1}
					{totalQuestions}
					{streak}
					{sessionScore}
				/>
				<QuestionPanel question={currentQuestion} {totalQuestions} />

				{#if currentQuestion.questionType === 'memory_pattern'}
					<MemoryRevealPanel metadata={currentQuestion.metadata} visible={revealVisible} />
				{/if}

				<ChoiceList
					choices={currentQuestion.choices}
					{selectedAnswer}
					questionType={currentQuestion.questionType}
					disabled={loading || transitioning}
					onSelect={(choice) => {
						selectedAnswer = choice;
					}}
				/>

				{#if feedbackStatus}
					<AnswerFeedback status={feedbackStatus} scoreEarned={feedbackScore} />
				{/if}
				{#if errorMessage}
					<p
						class="border-2 border-[var(--color-border)] bg-[var(--color-danger)] p-3 font-bold text-white"
					>
						{errorMessage}
					</p>
				{/if}

				<Button onclick={submitAnswer} disabled={!canSubmit} {loading}>
					{transitioning
						? feedbackStatus === 'complete'
							? 'Finishing Challenge'
							: 'Next Question'
						: remainingSeconds <= 0 && !selectedAnswer
							? 'Submit Expired Answer'
							: 'Submit Answer'}
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
