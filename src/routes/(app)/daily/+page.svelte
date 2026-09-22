<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import type { ApiResponse } from '$lib/shared/types/api';
	import type { StartDailyChallengeResult } from '$lib/server/challenge/daily-challenge-service';
	import { getI18nContext } from '$lib/i18n/context';
	import { formatPercent, formatSeconds } from '$lib/shared/presentation/format';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import Button from '$lib/components/primitives/Button.svelte';
	import Card from '$lib/components/primitives/Card.svelte';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();
	const { locale, t } = getI18nContext();

	let status = $derived(data.dailyStatus);
	let elapsedSeconds = $state(0);
	let secondsLeft = $derived(Math.max(0, data.dailyStatus.secondsUntilReset - elapsedSeconds));
	let loading = $state(false);
	let errorMessage = $state<string | null>(null);

	let timer: ReturnType<typeof setInterval> | undefined;

	onMount(() => {
		timer = setInterval(() => {
			elapsedSeconds += 1;
		}, 1000);
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
	});

	function formatCountdown(totalSec: number): string {
		const hours = Math.floor(totalSec / 3600);
		const minutes = Math.floor((totalSec % 3600) / 60);
		const seconds = totalSec % 60;
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
	}

	async function handleStartDaily() {
		loading = true;
		errorMessage = null;

		try {
			const res = await fetch('/api/challenge/daily/start', {
				method: 'POST',
				headers: { 'content-type': 'application/json' }
			});
			const payload = (await res.json()) as ApiResponse<StartDailyChallengeResult>;

			if (!payload.ok) {
				errorMessage = payload.error?.message ?? 'Failed to start daily challenge';
				return;
			}

			// Redirect to arena with active session
			await goto('/challenge');
		} catch (e) {
			errorMessage = (e as Error).message || 'Network error';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>{t('label.daily')} — Tarkana</title>
</svelte:head>

<section class="grid gap-8">
	<!-- Hero Banner -->
	<header class="ink-panel grid gap-6 bg-white p-5 md:p-8 lg:grid-cols-[1fr_360px] lg:items-center">
		<div class="space-y-4">
			<div class="flex flex-wrap items-center gap-2">
				<p class="page-kicker">{t('label.daily')}</p>
				<Badge tone="accent">UTC {status.date}</Badge>
				{#if status.attemptStatus === 'completed'}
					<Badge tone="success">Completed</Badge>
				{:else if status.attemptStatus === 'in_progress'}
					<Badge tone="warning">In Progress</Badge>
				{:else if status.attemptStatus === 'abandoned'}
					<Badge tone="neutral">Forfeited</Badge>
				{/if}
			</div>

			<h1 class="page-title">{t('label.daily')}</h1>
			<p class="max-w-2xl text-lg font-semibold text-[var(--color-muted)]">
				10 logic puzzles generated globally with immutable parameters. Every player in the world
				plays the identical puzzle today. Strictly one official attempt per day.
			</p>

			<div class="grid max-w-xl gap-3 sm:grid-cols-2">
				<div class="border-[3px] border-[var(--color-border)] bg-[var(--color-paper)] p-4">
					<p class="text-xs font-black text-[var(--color-muted)] uppercase">Next Challenge In</p>
					<p class="font-mono text-3xl font-black text-[var(--color-text)]">
						{formatCountdown(secondsLeft)}
					</p>
				</div>
				<div class="border-[3px] border-[var(--color-border)] bg-[var(--color-primary)] p-4">
					<p class="text-xs font-black text-[var(--color-text)] uppercase">Format</p>
					<p class="text-2xl font-black text-[var(--color-text)]">
						{status.totalQuestions} Questions
					</p>
				</div>
			</div>
		</div>

		<!-- Action / Status Card -->
		<div
			class="border-[3px] border-[var(--color-border)] bg-[var(--color-paper)] p-6 text-center lg:text-left"
		>
			{#if errorMessage}
				<div class="mb-4 border-2 border-red-500 bg-red-100 p-3 text-sm font-bold text-red-900">
					{errorMessage}
				</div>
			{/if}

			{#if status.attemptStatus === 'not_started'}
				<h3 class="text-xl font-black">{t('dashboard.startChallenge')}</h3>
				<p class="mt-2 text-sm text-[var(--color-muted)]">
					One official attempt per day. Your official attempt locks when started.
				</p>
				<Button size="lg" class="mt-6 w-full" disabled={loading} onclick={handleStartDaily}>
					{loading ? 'Preparing...' : 'Start Daily Challenge'}
				</Button>
			{:else if status.attemptStatus === 'in_progress'}
				<h3 class="text-xl font-black">Challenge In Progress</h3>
				<p class="mt-2 text-sm text-[var(--color-muted)]">
					You have an active daily challenge session waiting for you.
				</p>
				<Button href="/challenge" size="lg" class="mt-6 w-full">Resume Challenge</Button>
			{:else if status.attemptStatus === 'completed' && status.completedAttempt}
				<h3 class="text-xl font-black">Today's Result</h3>
				<p class="mt-1 text-sm text-[var(--color-muted)]">Official attempt completed!</p>

				<div class="mt-4 grid grid-cols-2 gap-2 text-left">
					<div class="border-2 border-[var(--color-border)] bg-white p-3">
						<span class="text-xs font-bold text-[var(--color-muted)]">Score</span>
						<p class="text-xl font-black">{status.completedAttempt.score}</p>
					</div>
					<div class="border-2 border-[var(--color-border)] bg-white p-3">
						<span class="text-xs font-bold text-[var(--color-muted)]">Accuracy</span>
						<p class="text-xl font-black">
							{formatPercent(status.completedAttempt.accuracy, locale)}
						</p>
					</div>
				</div>

				<p class="mt-4 text-xs font-semibold text-[var(--color-muted)]">
					Total solve time: {formatSeconds(status.completedAttempt.totalTimeSeconds, locale)}. Next
					puzzle resets at 00:00 UTC.
				</p>
			{:else if status.attemptStatus === 'abandoned'}
				<h3 class="text-xl font-black text-amber-700">Attempt Forfeited</h3>
				<p class="mt-2 text-sm text-[var(--color-muted)]">
					Today's official attempt was forfeited. Check back after midnight UTC for the next daily
					challenge!
				</p>
			{/if}
		</div>
	</header>

	<!-- Information Cards -->
	<div class="grid gap-6 md:grid-cols-3">
		<Card title="Global Determinism" description="Identical challenges worldwide">
			<p class="text-sm text-[var(--color-muted)]">
				Every question, distractor, and timing is deterministically computed from an immutable
				server-side snapshot.
			</p>
		</Card>

		<Card title="Fair Competition" description="Unbiased difficulty">
			<p class="text-sm text-[var(--color-muted)]">
				The daily challenge difficulty curve is standardized for all players and does not alter your
				competitive Logic Rating.
			</p>
		</Card>

		<Card title="Daily Habit" description="Resets at 00:00:00 UTC">
			<p class="text-sm text-[var(--color-muted)]">
				Solve daily to maintain consistency and prepare for ranked competitive matches.
			</p>
		</Card>
	</div>
</section>
