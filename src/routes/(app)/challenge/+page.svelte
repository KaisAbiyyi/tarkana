<script lang="ts">
	import { onMount } from 'svelte';
	import { goto, replaceState } from '$app/navigation';
	import { gsap } from 'gsap';

	import type { PageData } from './$types';
	import type { ApiResponse } from '$lib/shared/types/api';
	import type { QuestionType } from '$lib/shared/constants/challenge';
	import {
		createRoundModeOptions,
		createRoundSessionOptions,
		getRoundConfiguration,
		type RoundMode,
		type RoundSessionType
	} from '$lib/shared/constants/round-preparation';
	import { createArenaLabels } from '$lib/shared/presentation/arena-labels';
	import { getI18nContext } from '$lib/i18n/context';

	import Badge from '$lib/components/primitives/Badge.svelte';
	import Button from '$lib/components/primitives/Button.svelte';
	import Card from '$lib/components/primitives/Card.svelte';
	import GameCard from '$lib/components/primitives/GameCard.svelte';
	import ReadinessStepper from '$lib/components/primitives/ReadinessStepper.svelte';
	import ArenaSummaryPanel from '$lib/components/challenge/ArenaSummaryPanel.svelte';
	import AnswerFeedback, {
		type FeedbackStatus
	} from '$lib/components/challenge/AnswerFeedback.svelte';
	import ChoiceList from '$lib/components/challenge/ChoiceList.svelte';
	import MemoryRevealPanel from '$lib/components/challenge/MemoryRevealPanel.svelte';
	import QuestionPanel from '$lib/components/challenge/QuestionPanel.svelte';
	import SessionMomentum from '$lib/components/challenge/SessionMomentum.svelte';

	type ActiveQuestionDto = {
		sessionQuestionId: string;
		categoryId: string;
		questionType: QuestionType;
		prompt: string;
		choices: string[];
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

	type Props = { data: PageData };

	let { data }: Props = $props();
	const { locale, t } = getI18nContext();
	const ARENA_LABELS = createArenaLabels(locale);
	const ROUND_MODE_OPTIONS = createRoundModeOptions(t);
	const ROUND_SESSION_OPTIONS = createRoundSessionOptions(t);

	let activeChallenge = $derived(data.activeChallenge);
	let showResumeModal = $state(false);

	let preparationElement = $state<HTMLElement | null>(null);
	let challengeType = $state<RoundSessionType | null>(null);
	let selectedMode = $state<RoundMode | null>(null);
	let sessionId = $state('');
	let totalQuestions = $state(0);
	let currentQuestion = $state<ActiveQuestionDto | null>(null);
	let selectedAnswer = $state('');
	let remainingSeconds = $state(0);
	let startedAtMs = $state<number | null>(null);
	let loading = $state(false);
	let transitioning = $state(false);
	let errorMessage = $state<string | null>(null);
	let selectionAnnouncement = $state('');
	let feedbackStatus = $state<FeedbackStatus | null>(null);
	let feedbackScore = $state(0);
	let streak = $state(0);
	let sessionScore = $state(0);
	let revealVisible = $state(false);
	let tabSwitchCount = 0;
	let mounted = false;
	const MEMORY_CELLS = Array.from({ length: 9 }, (_, index) => index);

	let availableModes = $derived.by(() => {
		const supported = ROUND_MODE_OPTIONS.filter(
			(option) => option.id !== 'mixed' && data.questionTypes.includes(option.id)
		);
		return supported.length > 0 ? [ROUND_MODE_OPTIONS[0], ...supported] : [];
	});
	let roundConfiguration = $derived(
		getRoundConfiguration(challengeType, selectedMode, ROUND_SESSION_OPTIONS, ROUND_MODE_OPTIONS)
	);
	let currentModeInfo = $derived(
		ROUND_MODE_OPTIONS.find((option) => option.id === selectedMode) ?? {
			id: 'mixed' as const,
			name: t('prep.chooseModePlaceholder'),
			description: t('prep.chooseLoadout'),
			categoryLabel: t('prep.notSelected')
		}
	);
	let currentSessionInfo = $derived(
		ROUND_SESSION_OPTIONS.find((option) => option.id === challengeType) ?? null
	);

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const session = params.get('session');
		const mode = params.get('mode');
		if (ROUND_SESSION_OPTIONS.some((option) => option.id === session)) {
			challengeType = session as RoundSessionType;
		}
		if (mode === 'mixed' || data.questionTypes.includes(mode as QuestionType)) {
			selectedMode = mode as RoundMode;
		}
		mounted = true;

		const onVisibilityChange = () => {
			if (document.hidden && currentQuestion) tabSwitchCount += 1;
		};
		document.addEventListener('visibilitychange', onVisibilityChange);

		let entranceContext: gsap.Context | undefined;
		if (preparationElement && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			entranceContext = gsap.context(() => {
				gsap.fromTo(
					'.prep-enter',
					{ y: 10, opacity: 0.72 },
					{
						y: 0,
						opacity: 1,
						duration: 0.32,
						stagger: 0.045,
						ease: 'power2.out',
						clearProps: 'transform,opacity'
					}
				);
			}, preparationElement);
		}

		if (activeChallenge?.hasActive && activeChallenge?.currentQuestion) {
			showResumeModal = true;
		}

		return () => {
			document.removeEventListener('visibilitychange', onVisibilityChange);
			entranceContext?.revert();
		};
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
				? window.setTimeout(() => (revealVisible = false), revealSeconds * 1000)
				: undefined;
		const timer = window.setInterval(() => {
			if (startedAtMs === null) return;
			const elapsed = Math.floor((Date.now() - startedAtMs) / 1000);
			remainingSeconds = Math.max(0, activeQuestion.timeLimitSeconds - elapsed);

			if (remainingSeconds <= 0 && !transitioning && feedbackStatus === null) {
				feedbackStatus = 'timeout';
			}
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
			(feedbackStatus === null || feedbackStatus === 'timeout') &&
			(selectedAnswer.length > 0 || remainingSeconds <= 0)
	);

	function chooseSession(session: (typeof ROUND_SESSION_OPTIONS)[number]): void {
		if (loading || challengeType === session.id) return;
		challengeType = session.id;
		errorMessage = null;
		selectionAnnouncement = t('prep.sessionSelected', {
			name: session.name,
			questions: session.questionCount,
			minutes: session.estimatedMinutes
		});
		syncRouteSelection();
	}

	function chooseMode(mode: (typeof ROUND_MODE_OPTIONS)[number]): void {
		if (loading || selectedMode === mode.id) return;
		selectedMode = mode.id;
		errorMessage = null;
		selectionAnnouncement = t('prep.modeSelected', { name: mode.name });
		syncRouteSelection();
	}

	function syncRouteSelection(): void {
		if (!mounted || window.location.pathname === '/') return;
		const url = new URL(window.location.href);
		if (challengeType) url.searchParams.set('session', challengeType);
		else url.searchParams.delete('session');
		if (selectedMode) url.searchParams.set('mode', selectedMode);
		else url.searchParams.delete('mode');
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		replaceState(`${url.pathname}${url.search}`, {});
	}

	async function startChallenge(): Promise<void> {
		const configuration = roundConfiguration;
		if (!configuration || loading) return;

		loading = true;
		errorMessage = null;
		feedbackStatus = null;
		feedbackScore = 0;
		streak = 0;
		sessionScore = 0;
		selectionAnnouncement = t('prep.preparing');

		try {
			const response = await fetch('/api/challenge/start', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(configuration.startPayload)
			});
			const payload = (await response.json()) as ApiResponse<StartChallengeResult>;
			if (!payload.ok) {
				errorMessage = t('prep.failed');
				selectionAnnouncement = t('prep.retrySaved');
				return;
			}

			sessionId = payload.data.sessionId;
			totalQuestions = payload.data.totalQuestions;
			currentQuestion = payload.data.currentQuestion;
			errorMessage = ARENA_LABELS.connectionLost;
			selectionAnnouncement = t('prep.connectionRetry');
		} finally {
			loading = false;
		}
	}

	function resumeChallenge(): void {
		if (!activeChallenge?.currentQuestion || !activeChallenge?.sessionId) return;
		sessionId = activeChallenge.sessionId;
		totalQuestions = activeChallenge.totalQuestions || 0;
		selectedMode = activeChallenge.currentQuestion.questionType as RoundMode;
		challengeType = activeChallenge.challengeType as RoundSessionType;
		currentQuestion = activeChallenge.currentQuestion;
		showResumeModal = false;
	}

	async function abandonChallenge(): Promise<void> {
		if (!activeChallenge?.sessionId) return;
		loading = true;
		errorMessage = null;

		try {
			await fetch('/api/challenge/abandon', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ sessionId: activeChallenge.sessionId })
			});
			showResumeModal = false;
		} catch {
			errorMessage = ARENA_LABELS.connectionLost;
		} finally {
			loading = false;
		}
	}

	async function submitAnswer(): Promise<void> {
		if (!currentQuestion) return;
		if (feedbackStatus === 'complete' || transitioning) {
			if (feedbackStatus === 'complete') {
				await finishChallenge();
			}
			return;
		}

		loading = true;
		errorMessage = null;
		const timeSpentSeconds =
			startedAtMs === null
				? currentQuestion.timeLimitSeconds
				: Math.min(
						currentQuestion.timeLimitSeconds,
						Math.max(0, Math.ceil((Date.now() - startedAtMs) / 1000))
					);
		const selected = selectedAnswer || t('arena.timeExpiredAnswer');

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
			errorMessage = ARENA_LABELS.submitErrorRetry;
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

		// eslint-disable-next-line svelte/no-navigation-without-resolve
		await goto(`/result/${sessionId}`);
	}

	function waitForFeedback(): Promise<void> {
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		return new Promise((resolveDelay) => window.setTimeout(resolveDelay, reducedMotion ? 0 : 850));
	}
</script>

<svelte:head>
	<title>{t('prep.title')}</title>
	<meta name="description" content={t('prep.meta')} />
</svelte:head>

{#snippet quickMotif()}
	<svg viewBox="0 0 24 24" class="motif-svg" fill="none" stroke="currentColor" stroke-width="3"
		><path d="m13 2-9 12h7l-1 8 9-12h-7z" /></svg
	>
{/snippet}
{#snippet standardMotif()}
	<div class="motif-bars"><span></span><span></span><span></span></div>
{/snippet}
{#snippet longMotif()}
	<svg viewBox="0 0 24 24" class="motif-svg" fill="none" stroke="currentColor" stroke-width="3"
		><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg
	>
{/snippet}
{#snippet mixedMotif()}
	<div class="mixed-motif"><span></span><span></span><span></span><span></span></div>
{/snippet}
{#snippet numberMotif()}
	<div class="number-motif"><span></span><span></span><span></span></div>
{/snippet}
{#snippet symbolMotif()}
	<div class="symbol-motif"><span></span><span></span></div>
{/snippet}
{#snippet deductionMotif()}
	<svg viewBox="0 0 24 24" class="motif-svg" fill="none" stroke="currentColor" stroke-width="3"
		><circle cx="6" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><path d="m8 8 8 8" /></svg
	>
{/snippet}
{#snippet memoryMotif()}
	<div class="memory-motif">
		{#each MEMORY_CELLS as index (index)}<span class:filled={index % 2 === 0}></span>{/each}
	</div>
{/snippet}
{#snippet mixedExtras()}
	<div class="category-markers" aria-label={t('prep.included')}>
		{#each ROUND_MODE_OPTIONS.slice(1) as mode (mode.id)}<span>{mode.categoryLabel}</span>{/each}
	</div>
{/snippet}

<section class="challenge-page">
	{#if !currentQuestion}
		<div bind:this={preparationElement} class="preparation">
			<header class="prep-header prep-enter">
				<div>
					<p class="page-kicker">{ARENA_LABELS.arenaRanked}</p>
					<h1>{t('prep.prepareNext')}</h1>
					<p class="intro">{t('prep.configure')}</p>
				</div>
				<div class="header-status" aria-label={t('prep.ratingStatus')}>
					<Badge tone="success">{t('prep.verifiedResult')}</Badge>
					<span>{t('prep.ratingAfter')}</span>
				</div>
			</header>

			<div class="prep-layout">
				<div class="configuration">
					<div class="prep-enter">
						<ReadinessStepper
							isSessionValid={Boolean(challengeType)}
							isModeValid={Boolean(selectedMode)}
							isEntering={loading}
						/>
					</div>

					<section class="choice-section prep-enter" aria-labelledby="session-heading">
						<div class="section-heading">
							<span>01</span>
							<div>
								<h2 id="session-heading">{t('prep.chooseSession')}</h2>
								<p>{t('prep.chooseSessionBody')}</p>
							</div>
						</div>
						<div class="session-grid">
							{#each ROUND_SESSION_OPTIONS as session (session.id)}
								<GameCard
									id={`session-${session.id}`}
									name="challenge-session"
									value={session.id}
									title={session.name}
									description={session.description}
									meta={t('prep.questionsMinutes', {
										questions: session.questionCount,
										minutes: session.estimatedMinutes
									})}
									selected={challengeType === session.id}
									disabled={loading}
									onselect={() => chooseSession(session)}
									motif={session.id === 'quick'
										? quickMotif
										: session.id === 'standard'
											? standardMotif
											: longMotif}
								/>
							{/each}
						</div>
					</section>

					<section class="choice-section prep-enter" aria-labelledby="mode-heading">
						<div class="section-heading">
							<span>02</span>
							<div>
								<h2 id="mode-heading">{t('prep.chooseMode')}</h2>
								<p>{t('prep.chooseModeBody')}</p>
							</div>
						</div>
						{#if availableModes.length > 0}
							<div class="mode-grid">
								{#each availableModes as mode (mode.id)}
									<div class:mixed-card={mode.id === 'mixed'}>
										<GameCard
											id={`mode-${mode.id}`}
											name="challenge-mode"
											value={mode.id}
											title={mode.name}
											description={mode.description}
											selected={selectedMode === mode.id}
											disabled={loading}
											onselect={() => chooseMode(mode)}
											motif={mode.id === 'mixed'
												? mixedMotif
												: mode.id === 'number_sequence'
													? numberMotif
													: mode.id === 'symbol_pattern'
														? symbolMotif
														: mode.id === 'mini_deduction'
															? deductionMotif
															: memoryMotif}
											extras={mode.id === 'mixed' ? mixedExtras : undefined}
										/>
									</div>
								{/each}
							</div>
						{:else}
							<div class="empty-modes" role="status">
								<strong>{t('prep.noModes')}</strong>
								<p>
									{t('prep.noCategories')}
								</p>
							</div>
						{/if}
					</section>
				</div>

				<aside class="prep-sidebar prep-enter">
					<ArenaSummaryPanel
						modeName={currentModeInfo.name}
						sessionName={currentSessionInfo?.name ?? t('prep.chooseSession')}
						modeDescription={currentModeInfo.description}
						questionCount={currentSessionInfo?.questionCount ?? null}
						estimatedMinutes={currentSessionInfo?.estimatedMinutes ?? null}
						isReady={Boolean(roundConfiguration)}
						{loading}
						{errorMessage}
						rank={data.profile.rank}
						rating={data.profile.rating}
						onstart={startChallenge}
						motif={selectedMode === 'mixed'
							? mixedMotif
							: selectedMode === 'number_sequence'
								? numberMotif
								: selectedMode === 'symbol_pattern'
									? symbolMotif
									: selectedMode === 'mini_deduction'
										? deductionMotif
										: selectedMode === 'memory_pattern'
											? memoryMotif
											: undefined}
					/>
				</aside>
			</div>
			<p class="sr-only" aria-live="polite" aria-atomic="true">{selectionAnnouncement}</p>
		</div>
	{:else}
		<header class="live-header">
			<div class="space-y-2">
				<p class="page-kicker">{ARENA_LABELS.arenaRanked}</p>
				<h1 class="page-title">{currentModeInfo.name}</h1>
			</div>
		</header>

		<div class="live-layout">
			<div class="live-main">
				<SessionMomentum
					currentQuestion={currentQuestion.orderIndex + 1}
					{totalQuestions}
					{streak}
					{sessionScore}
					{remainingSeconds}
					totalSeconds={currentQuestion.timeLimitSeconds}
					questionType={selectedMode === 'mixed' ? currentQuestion.questionType : undefined}
				/>

				<QuestionPanel question={currentQuestion} />

				{#if currentQuestion.questionType === 'memory_pattern'}
					<MemoryRevealPanel metadata={currentQuestion.metadata} visible={revealVisible} />
				{/if}

				<ChoiceList
					choices={currentQuestion.choices}
					{selectedAnswer}
					questionType={currentQuestion.questionType}
					disabled={loading || transitioning || revealVisible}
					locked={feedbackStatus !== null && feedbackStatus !== 'timeout'}
					{feedbackStatus}
					timedOut={feedbackStatus === 'timeout'}
					onSelect={(choice) => (selectedAnswer = choice)}
				/>

				{#if feedbackStatus && feedbackStatus !== 'timeout'}
					<AnswerFeedback status={feedbackStatus} scoreEarned={feedbackScore} />
				{/if}

				{#if errorMessage}
					<p
						class="border-2 border-[var(--color-border)] bg-[var(--color-danger)] p-3 font-bold text-white"
						role="alert"
					>
						{errorMessage}
					</p>
				{/if}

				<div class="submit-area">
					<Button
						onclick={submitAnswer}
						disabled={!canSubmit && feedbackStatus !== 'complete'}
						{loading}
						variant="ink"
						size="lg"
						class="w-full"
					>
						{#if feedbackStatus === 'complete'}
							{ARENA_LABELS.finishingRound}
						{:else if transitioning}
							{ARENA_LABELS.nextQuestion}
						{:else if feedbackStatus === 'timeout' && !selectedAnswer}
							{ARENA_LABELS.submitAnswerTimeout}
						{:else if loading}
							{ARENA_LABELS.submitting}
						{:else}
							{ARENA_LABELS.submitAnswer}
						{/if}
					</Button>
					{#if !selectedAnswer && !transitioning && feedbackStatus === null && remainingSeconds > 0}
						<p class="select-hint">
							{ARENA_LABELS.selectHint}
						</p>
					{/if}
				</div>

				<div
					class="compact-rules mt-6 border-t-2 border-[var(--color-border)] pt-3 text-center text-xs font-bold text-[var(--color-muted)]"
				>
					{ARENA_LABELS.ruleSingleAnswer} &middot; {ARENA_LABELS.ruleTimerRunning} &middot; {ARENA_LABELS.ruleReviewAfterRound}
				</div>
			</div>
		</div>
	{/if}

	{#if showResumeModal}
		<div class="resume-modal-overlay">
			<div class="resume-modal" role="dialog" aria-modal="true" aria-labelledby="resume-title">
				<h2 id="resume-title">Sesi Belum Selesai</h2>
				<p>Kamu punya challenge yang belum selesai.</p>
				{#if errorMessage}
					<p class="error-msg">{errorMessage}</p>
				{/if}
				<div class="resume-actions">
					<Button onclick={resumeChallenge} size="lg" {loading}>Lanjutkan</Button>
					<Button onclick={abandonChallenge} size="lg" variant="ghost" {loading}
						>Buang & Mulai Baru</Button
					>
				</div>
			</div>
		</div>
	{/if}
</section>

<style>
	.challenge-page,
	.preparation,
	.configuration,
	.choice-section,
	.prep-sidebar {
		display: grid;
	}

	.challenge-page,
	.preparation {
		gap: 2rem;
	}

	.prep-header {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 2rem;
	}

	.prep-header h1 {
		max-width: 780px;
		margin: 0.25rem 0 0;
		font-family: var(--font-display);
		font-size: clamp(2.5rem, 5vw, 4.25rem);
		font-weight: 900;
		line-height: 0.98;
		letter-spacing: -0.035em;
	}

	.intro {
		max-width: 620px;
		margin: 0.8rem 0 0;
		font-size: clamp(1rem, 2vw, 1.2rem);
		font-weight: 700;
		color: var(--color-muted);
	}

	.header-status {
		display: grid;
		gap: 0.4rem;
		max-width: 230px;
		font-size: 0.72rem;
		font-weight: 750;
		text-align: right;
	}

	.prep-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(330px, 390px);
		align-items: start;
		gap: 2rem;
	}

	.configuration {
		gap: 2rem;
	}
	.choice-section {
		gap: 1rem;
	}

	.section-heading {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.section-heading > span {
		display: grid;
		width: 2rem;
		height: 2rem;
		flex: 0 0 auto;
		place-items: center;
		border: 2px solid var(--color-border);
		background: var(--color-primary);
		box-shadow: 2px 2px 0 var(--color-border);
		font-size: 0.72rem;
		font-weight: 900;
	}

	.section-heading h2 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 900;
	}
	.section-heading p {
		margin: 0.2rem 0 0;
		font-size: 0.78rem;
		font-weight: 650;
		color: var(--color-muted);
	}

	.session-grid,
	.mode-grid {
		display: grid;
		gap: 1rem;
	}
	.session-grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
	.mode-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
	.mixed-card {
		grid-column: 1 / -1;
	}

	.prep-sidebar {
		gap: 1.25rem;
	}

	.empty-modes {
		border: 3px dashed var(--color-border);
		background: white;
		padding: 1rem;
	}
	.empty-modes p {
		margin: 0.25rem 0 0;
		font-size: 0.82rem;
		font-weight: 650;
	}

	.category-markers {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.category-markers span {
		border: 2px solid var(--color-border);
		background: white;
		padding: 0.2rem 0.4rem;
		font-size: 0.62rem;
		font-weight: 900;
		text-transform: uppercase;
	}

	:global(.motif-svg) {
		width: 1.5rem;
		height: 1.5rem;
	}
	.motif-bars,
	.number-motif {
		display: flex;
		align-items: end;
		gap: 0.15rem;
		height: 1.4rem;
	}
	.motif-bars span,
	.number-motif span {
		width: 0.3rem;
		border: 2px solid var(--color-border);
		background: var(--color-ink);
	}
	.motif-bars span:nth-child(1),
	.number-motif span:nth-child(1) {
		height: 45%;
	}
	.motif-bars span:nth-child(2),
	.number-motif span:nth-child(2) {
		height: 75%;
	}
	.motif-bars span:nth-child(3),
	.number-motif span:nth-child(3) {
		height: 100%;
	}
	.mixed-motif {
		display: grid;
		grid-template-columns: repeat(2, 0.65rem);
		gap: 0.15rem;
	}
	.mixed-motif span {
		height: 0.65rem;
		border: 2px solid var(--color-border);
	}
	.mixed-motif span:nth-child(2) {
		border-radius: 999px;
		background: var(--color-ink);
	}
	.mixed-motif span:nth-child(3) {
		background: var(--color-primary);
	}
	.mixed-motif span:nth-child(4) {
		transform: rotate(45deg);
		background: var(--color-ink);
	}
	.symbol-motif {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	.symbol-motif span:first-child {
		width: 0.8rem;
		height: 0.8rem;
		border: 3px solid var(--color-border);
		border-radius: 999px;
	}
	.symbol-motif span:nth-child(2) {
		width: 0.6rem;
		height: 0.6rem;
		background: var(--color-ink);
	}

	.resume-modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.75);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.resume-modal {
		background: white;
		border: 4px solid var(--color-border);
		box-shadow: 8px 8px 0 var(--color-ink);
		padding: 2rem;
		max-width: 480px;
		width: 100%;
		text-align: center;
	}

	.resume-modal h2 {
		font-size: 1.5rem;
		font-weight: 900;
		margin: 0 0 0.5rem;
	}

	.resume-modal p {
		font-weight: 700;
		color: var(--color-muted);
		margin: 0 0 1.5rem;
	}

	.resume-modal .error-msg {
		color: white;
		background: var(--color-danger);
		padding: 0.5rem;
		border: 2px solid var(--color-border);
		margin-bottom: 1.5rem;
	}

	.resume-actions {
		display: grid;
		gap: 0.75rem;
	}
	.symbol-motif span:last-child {
		width: 0;
		height: 0;
		border-right: 0.45rem solid transparent;
		border-bottom: 0.8rem solid var(--color-ink);
		border-left: 0.45rem solid transparent;
	}
	.memory-motif {
		display: grid;
		grid-template-columns: repeat(3, 0.35rem);
		gap: 0.12rem;
	}
	.memory-motif span {
		height: 0.35rem;
		border: 1px solid var(--color-border);
	}
	.memory-motif span.filled {
		background: var(--color-ink);
	}

	/* Live Round Layout */
	.live-header {
		display: grid;
		gap: 0.5rem;
		grid-template-columns: 1fr;
		align-items: end;
	}

	.live-layout {
		margin-top: 2rem;
	}

	.live-main {
		display: grid;
		gap: 1.5rem;
		align-content: start;
	}

	.submit-area {
		display: grid;
		gap: 0.5rem;
	}

	.select-hint {
		text-align: center;
		font-size: 0.78rem;
		font-weight: 750;
		color: var(--color-muted);
	}

	@media (min-width: 1000px) {
		.prep-sidebar {
			position: sticky;
			top: 6.5rem;
		}
	}

	@media (max-width: 999px) {
		.prep-layout {
			grid-template-columns: 1fr;
		}
		.prep-sidebar {
			grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
			align-items: start;
		}
	}

	@media (max-width: 767px) {
		.challenge-page,
		.preparation {
			gap: 1.5rem;
		}
		.prep-header {
			align-items: flex-start;
			flex-direction: column;
			gap: 1rem;
		}
		.header-status {
			max-width: none;
			text-align: left;
		}
		.session-grid {
			grid-template-columns: 1fr;
		}
		.prep-sidebar {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 520px) {
		.mode-grid {
			grid-template-columns: 1fr;
		}
		.mixed-card {
			grid-column: auto;
		}
	}
</style>
