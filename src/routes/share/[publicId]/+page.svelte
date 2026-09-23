<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import PublicShell from '$lib/components/app/PublicShell.svelte';
	import Button from '$lib/components/primitives/Button.svelte';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import Card from '$lib/components/primitives/Card.svelte';
	import { formatPercent, formatSeconds } from '$lib/shared/presentation/format';
	import { getI18nContext } from '$lib/i18n/context';
	import { analytics } from '$lib/client/analytics';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();
	const { locale, t } = getI18nContext();

	let share = $derived(data.shareResult);
	let appOrigin = $derived(data.appOrigin);
	let isDaily = $derived(share.challengeType === 'daily');

	let ogImageUrl = $derived(`${appOrigin}/api/og/share/${share.publicId}.png`);
	let sharePageUrl = $derived(`${appOrigin}/share/${share.publicId}`);

	let pageTitle = $derived(
		`${share.displayName}'s Logic Challenge Result: ${share.totalScore} PTS | Tarkana`
	);
	let pageDescription = $derived(
		`${share.displayName} scored ${share.totalScore} with ${Math.round(share.accuracy * 100)}% accuracy on Tarkana. Can you beat this score?`
	);

	onMount(() => {
		let referrer = 'direct';
		try {
			if (document.referrer) {
				referrer = new URL(document.referrer, window.location.href).hostname;
			}
		} catch {
			/* ignore */
		}

		analytics.track('shared_result_viewed', {
			share_id: share.publicId,
			challenge_type: share.challengeType,
			referrer
		});
	});

	function handleCtaClick(destination: string) {
		analytics.track('shared_result_cta_clicked', {
			share_id: share.publicId,
			challenge_type: share.challengeType,
			destination
		});
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDescription} />

	<!-- OpenGraph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:image" content={ogImageUrl} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:url" content={sharePageUrl} />

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={pageTitle} />
	<meta name="twitter:description" content={pageDescription} />
	<meta name="twitter:image" content={ogImageUrl} />
</svelte:head>

<PublicShell>
	<div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
		<div class="grid gap-8">
			<!-- Header Banner -->
			<header class="grid gap-3">
				<div class="flex flex-wrap items-center gap-2">
					<Badge tone="accent">
						{isDaily ? `DAILY CHALLENGE • ${share.challengeDate}` : 'STANDARD LOGIC CHALLENGE'}
					</Badge>
					<Badge tone="neutral">
						{share.logicRank}
					</Badge>
				</div>
				<h1 class="text-3xl font-black tracking-tight text-[var(--color-foreground)] sm:text-4xl">
					{#if isDaily && share.challengeDate}
						{t('share.completedDaily', { name: share.displayName, date: share.challengeDate })}
					{:else}
						{t('share.completedStandard', { name: share.displayName })}
					{/if}
				</h1>
			</header>

			<!-- Score & Stats Card -->
			<Card title={t('result.sessionResult')} tone="accent">
				<div class="grid gap-6 md:grid-cols-2 md:items-center">
					<div>
						<p class="text-sm font-black text-[var(--color-muted)] uppercase">
							{t('result.reasoningScore')}
						</p>
						<p class="text-6xl font-black text-[var(--color-foreground)]">
							{share.totalScore}
						</p>
						<div class="mt-3 flex flex-wrap gap-2">
							<Badge tone="success">
								{t('result.correctCount', { count: share.correctAnswers })}
							</Badge>
							<Badge tone="neutral">
								{share.totalQuestions} Questions
							</Badge>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div class="border-2 border-[var(--color-border)] bg-white p-3">
							<p class="text-xs font-black text-[var(--color-muted)] uppercase">
								{t('result.accuracy')}
							</p>
							<p class="text-2xl font-black text-[var(--color-foreground)]">
								{formatPercent(share.accuracy, locale)}
							</p>
						</div>
						<div class="border-2 border-[var(--color-border)] bg-white p-3">
							<p class="text-xs font-black text-[var(--color-muted)] uppercase">
								{t('dashboard.averageTime')}
							</p>
							<p class="text-2xl font-black text-[var(--color-foreground)]">
								{formatSeconds(share.averageTimeSeconds, locale)}
							</p>
						</div>
						<div class="border-2 border-[var(--color-border)] bg-white p-3">
							<p class="text-xs font-black text-[var(--color-muted)] uppercase">Total Time</p>
							<p class="text-2xl font-black text-[var(--color-foreground)]">
								{formatSeconds(share.totalTimeSeconds, locale)}
							</p>
						</div>
						<div class="border-2 border-[var(--color-border)] bg-white p-3">
							<p class="text-xs font-black text-[var(--color-muted)] uppercase">
								{t('result.rank')}
							</p>
							<p class="text-2xl font-black text-blue-700">{share.logicRank}</p>
						</div>
					</div>
				</div>
			</Card>

			<!-- Anti-Spoiler Performance Breakdown -->
			<section
				class="border-2 border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-hard)]"
			>
				<div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<h2 class="text-xl font-black text-[var(--color-foreground)]">Question Performance</h2>
					<p class="text-xs font-bold text-[var(--color-muted)]">
						{t('share.antiSpoilerNotice')}
					</p>
				</div>

				<div class="flex flex-wrap gap-2.5">
					{#each share.questions as q (q.orderIndex)}
						<div
							class="flex h-12 w-12 items-center justify-center border-2 border-[var(--color-border)] text-lg font-black shadow-[2px_2px_0px_#000] {q.isCorrect
								? 'bg-green-500 text-white'
								: 'bg-red-500 text-white'}"
							aria-label="Question {q.orderIndex + 1}: {q.isCorrect ? 'Correct' : 'Incorrect'}"
						>
							{q.isCorrect ? '✓' : '✕'}
						</div>
					{/each}
				</div>
			</section>

			<!-- Primary Action & Conversion CTAs -->
			<div
				class="flex flex-col gap-4 rounded border-2 border-[var(--color-border)] bg-[var(--color-primary)] p-6 shadow-[var(--shadow-hard)] sm:flex-row sm:items-center sm:justify-between"
			>
				<div>
					<h3 class="text-xl font-black text-black">Can you beat this score?</h3>
					<p class="mt-1 text-sm font-bold text-black/80">
						{#if isDaily}
							Compete on today's official daily leaderboard.
						{:else}
							Test your calibrated deductive reasoning speed with a free challenge.
						{/if}
					</p>
				</div>
				<div class="flex shrink-0 flex-wrap gap-3">
					{#if isDaily}
						<Button href="/daily" onclick={() => handleCtaClick('/daily')}>
							{t('share.ctaPlayDaily')}
						</Button>
						<Button
							href="/leaderboard?tab=daily"
							variant="secondary"
							onclick={() => handleCtaClick('/leaderboard')}
						>
							{t('share.ctaLeaderboard')}
						</Button>
					{:else}
						<Button href="/challenge" onclick={() => handleCtaClick('/challenge')}>
							{t('share.ctaPlayStandard')}
						</Button>
					{/if}
					<Button href={`/api/og/share/${share.publicId}.png?download=1`} variant="secondary">
						{t('share.downloadCard')}
					</Button>
				</div>
			</div>
		</div>
	</div>
</PublicShell>
