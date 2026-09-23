<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import PublicShell from '$lib/components/app/PublicShell.svelte';
	import Button from '$lib/components/primitives/Button.svelte';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import Card from '$lib/components/primitives/Card.svelte';
	import {
		formatPercent,
		formatSeconds,
		labelChallengeType
	} from '$lib/shared/presentation/format';
	import { getI18nContext } from '$lib/i18n/context';
	import { analytics } from '$lib/client/analytics';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();
	const { locale, t } = getI18nContext();

	let duelView = $derived(data.duelView);
	let appOrigin = $derived(data.appOrigin);
	let isPreGame = $derived(duelView.state === 'pre_game');

	let duelPageUrl = $derived(`${appOrigin}/duel/${duelView.publicId}`);
	let ogImageUrl = $derived(`${appOrigin}/api/og/duel/${duelView.publicId}.png`);

	let pageTitle = $derived(
		isPreGame
			? `Logic Duel Challenge from ${duelView.creatorDisplayName} | Tarkana`
			: `Head-to-Head Duel Results | Tarkana`
	);

	let pageDescription = $derived(
		isPreGame
			? `${duelView.creatorDisplayName} has challenged you to an asynchronous logic duel on Tarkana. Can you beat their score on the exact same puzzles?`
			: `View the head-to-head results and group standings for this Tarkana logic duel.`
	);

	let accepting = $state(false);
	let acceptError = $state<string | null>(null);
	let copied = $state(false);
	let revoking = $state(false);
	let revoked = $state(false);

	onMount(() => {
		let referrer = 'direct';
		try {
			if (document.referrer) {
				referrer = new URL(document.referrer, window.location.href).hostname;
			}
		} catch {
			/* ignore */
		}

		analytics.track('duel_viewed', {
			duel_id: data.analyticsDuelId,
			state: duelView.state,
			challenge_type: duelView.sourceChallengeType,
			referrer
		});
	});

	async function handleAccept() {
		accepting = true;
		acceptError = null;

		try {
			analytics.track('duel_accepted', {
				duel_id: data.analyticsDuelId,
				challenge_type: duelView.sourceChallengeType
			});

			const response = await fetch('/api/duel/accept', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ publicId: duelView.publicId })
			});

			const result = await response.json();

			if (!response.ok || !result.ok) {
				acceptError = result.error?.message || 'Failed to accept duel. Please try again.';
				accepting = false;
				return;
			}

			const sessionId = result.data.sessionId;
			await goto(`/challenge?session=${sessionId}`);
		} catch (e: any) {
			acceptError = e?.message || 'Network error occurred while accepting duel.';
			accepting = false;
		}
	}

	async function handleCopyLink() {
		try {
			await navigator.clipboard.writeText(duelPageUrl);
			copied = true;
			analytics.track('duel_link_copied', {
				duel_id: data.analyticsDuelId
			});
			setTimeout(() => {
				copied = false;
			}, 2500);
		} catch {
			copied = false;
		}
	}

	async function handleRevoke() {
		if (
			!confirm(
				'Are you sure you want to revoke this duel invitation? No new players will be able to accept it.'
			)
		) {
			return;
		}

		revoking = true;
		try {
			const res = await fetch('/api/duel/revoke', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ publicId: duelView.publicId })
			});
			const result = await res.json();
			if (res.ok && result.ok) {
				revoked = true;
			} else {
				alert(result.error?.message || 'Failed to revoke duel.');
			}
		} catch {
			alert('Network error while revoking duel.');
		} finally {
			revoking = false;
		}
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
	<meta property="og:url" content={duelPageUrl} />

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={pageTitle} />
	<meta name="twitter:description" content={pageDescription} />
	<meta name="twitter:image" content={ogImageUrl} />
</svelte:head>

<PublicShell>
	<div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
		<div class="grid gap-8">
			{#if duelView.state === 'pre_game'}
				<!-- Pre-Game Blind Duel Invitation View -->
				{@const preGame = duelView}

				<header class="grid gap-3">
					<div class="flex flex-wrap items-center gap-2">
						<Badge tone="accent">
							{labelChallengeType(preGame.sourceChallengeType, locale).toUpperCase()} DUEL
						</Badge>
						<Badge tone="neutral">
							{preGame.totalQuestions} PUZZLES
						</Badge>
						{#if preGame.isExpired}
							<Badge tone="accent">EXPIRED</Badge>
						{/if}
					</div>

					<h1 class="text-3xl font-black tracking-tight text-[var(--color-foreground)] sm:text-4xl">
						{#if preGame.isCreator}
							Your Logic Duel is Ready to Share
						{:else}
							{t('duel.invitedYou', { name: preGame.creatorDisplayName })}
						{/if}
					</h1>

					<p class="text-base font-medium text-[var(--color-muted)]">
						Can you solve the exact same puzzle sequence faster and with higher accuracy?
					</p>
				</header>

				<!-- Blind Duel Secrecy Notice Box -->
				<div
					class="border-3 border-[var(--color-border)] bg-[var(--color-warning-subtle,#fef3c7)] p-4 shadow-[4px_4px_0_0_var(--color-border)]"
				>
					<div class="flex items-start gap-3">
						<span class="text-2xl" aria-hidden="true">🔒</span>
						<div>
							<h2
								class="text-base font-black tracking-wide text-[var(--color-foreground)] uppercase"
							>
								Blind Duel Rules
							</h2>
							<p class="mt-1 text-sm text-[var(--color-foreground)]">
								{t('duel.blindNotice')}
								You will face the identical puzzles in the same order. Complete your attempt to reveal
								the head-to-head comparison!
							</p>
						</div>
					</div>
				</div>

				<!-- Action / Acceptance Card -->
				<Card title="Duel Acceptance" tone="accent">
					{#if preGame.isCreator}
						<div class="grid gap-4 py-2">
							<p class="text-base font-bold text-[var(--color-foreground)]">
								Share this invite link with your friends or community:
							</p>
							<div class="flex flex-col items-stretch gap-3 sm:flex-row">
								<input
									type="text"
									readonly
									value={duelPageUrl}
									class="flex-1 border-2 border-[var(--color-border)] bg-white px-3 py-2 font-mono text-sm text-[var(--color-foreground)] shadow-[2px_2px_0_0_var(--color-border)] select-all"
									aria-label="Duel Invite URL"
								/>
								<Button variant="primary" onclick={handleCopyLink}>
									{copied ? 'Link Copied! ✓' : 'Copy Invite Link'}
								</Button>
							</div>

							<div class="mt-4 flex flex-wrap items-center gap-3">
								<Button href="/challenge" variant="secondary">Play Another Challenge</Button>
								{#if !revoked}
									<Button variant="ghost" onclick={handleRevoke} disabled={revoking}>
										{revoking ? 'Revoking...' : 'Revoke Invitation'}
									</Button>
								{:else}
									<Badge tone="accent">Invitation Revoked</Badge>
								{/if}
							</div>
						</div>
					{:else if preGame.hasAttemptInProgress}
						<div class="grid gap-4 py-2">
							<p class="text-base font-bold text-[var(--color-foreground)]">
								You have an in-progress attempt for this duel!
							</p>
							{#if acceptError}
								<div
									class="border-2 border-[var(--color-accent,#dc2626)] bg-red-50 p-3 text-sm font-bold text-[var(--color-accent,#dc2626)]"
								>
									{acceptError}
								</div>
							{/if}
							<div>
								<Button variant="primary" onclick={handleAccept} disabled={accepting}>
									{accepting ? 'Resuming Duel...' : 'Resume Duel Attempt'}
								</Button>
							</div>
						</div>
					{:else if preGame.isExpired}
						<div class="grid gap-4 py-2">
							<p class="text-base font-bold text-[var(--color-accent,#dc2626)]">
								{t('duel.expired')}
							</p>
							<p class="text-sm text-[var(--color-muted)]">
								Duel invitations expire after 7 days to keep leaderboards fresh. You can still test
								your reasoning in a solo challenge.
							</p>
							<div>
								<Button href="/challenge" variant="primary">Start a Solo Challenge</Button>
							</div>
						</div>
					{:else}
						<div class="grid gap-4 py-2">
							{#if acceptError}
								<div
									class="border-2 border-[var(--color-accent,#dc2626)] bg-red-50 p-3 text-sm font-bold text-[var(--color-accent,#dc2626)]"
								>
									{acceptError}
								</div>
							{/if}

							<p class="text-sm text-[var(--color-muted)]">
								Once accepted, your duel session will begin immediately with identical time limits
								per question.
							</p>

							<div>
								<Button variant="primary" onclick={handleAccept} disabled={accepting}>
									{accepting ? 'Starting Duel...' : t('duel.acceptCta')}
								</Button>
							</div>
						</div>
					{/if}
				</Card>
			{:else}
				<!-- Completed Head-to-Head Comparison View -->
				{@const comp = duelView}

				<header class="grid gap-3">
					<div class="flex flex-wrap items-center gap-2">
						<Badge tone="accent">
							{labelChallengeType(comp.sourceChallengeType, locale).toUpperCase()} DUEL
						</Badge>
						<Badge tone="neutral">
							{comp.totalQuestions} PUZZLES
						</Badge>
					</div>

					<h1 class="text-3xl font-black tracking-tight text-[var(--color-foreground)] sm:text-4xl">
						{t('duel.comparisonTitle')}
					</h1>
				</header>

				<!-- Outcome Banner (if participant) -->
				{#if comp.userParticipant && comp.outcome}
					{@const outcome = comp.outcome}
					<div
						class="border-3 border-[var(--color-border)] p-6 shadow-[6px_6px_0_0_var(--color-border)] {outcome ===
						'win'
							? 'bg-[#dcfce7]'
							: outcome === 'loss'
								? 'bg-[#fee2e2]'
								: 'bg-[#fef3c7]'}"
					>
						<div class="flex items-center gap-4">
							<span class="text-4xl" aria-hidden="true">
								{outcome === 'win' ? '🏆' : outcome === 'loss' ? '⚔️' : '🤝'}
							</span>
							<div>
								<h2 class="text-2xl font-black text-[var(--color-foreground)] uppercase">
									{outcome === 'win'
										? t('duel.victory')
										: outcome === 'loss'
											? t('duel.defeat')
											: t('duel.draw')}
								</h2>
								<p class="mt-1 text-sm font-bold text-[var(--color-foreground)]">
									{#if outcome === 'win'}
										You outperformed {comp.creatorDisplayName} across score, accuracy, and solve speed!
									{:else if outcome === 'loss'}
										{comp.creatorDisplayName} set a formidable benchmark. Can you beat it next time?
									{:else}
										An absolute deadlock! You and {comp.creatorDisplayName} tied across all criteria.
									{/if}
								</p>
							</div>
						</div>
					</div>
				{/if}

				<!-- Head-to-Head Side-by-Side Cards -->
				<div class="grid gap-6 md:grid-cols-2">
					<!-- Challenger Card -->
					<Card title={`Challenger: ${comp.creatorDisplayName}`} tone="accent">
						<div class="grid gap-4">
							<div>
								<p class="text-xs font-black text-[var(--color-muted)] uppercase">
									Reasoning Score
								</p>
								<p class="text-5xl font-black text-[var(--color-foreground)]">
									{comp.creatorScore}
								</p>
							</div>

							<div class="grid grid-cols-2 gap-3">
								<div class="border-2 border-[var(--color-border)] bg-white p-3">
									<p class="text-xs font-black text-[var(--color-muted)] uppercase">Accuracy</p>
									<p class="text-xl font-black text-[var(--color-foreground)]">
										{formatPercent(comp.creatorAccuracy, locale)}
									</p>
								</div>
								<div class="border-2 border-[var(--color-border)] bg-white p-3">
									<p class="text-xs font-black text-[var(--color-muted)] uppercase">Total Time</p>
									<p class="text-xl font-black text-[var(--color-foreground)]">
										{formatSeconds(comp.creatorTotalTimeSeconds, locale)}
									</p>
								</div>
							</div>

							<!-- Question Outcome Tiles -->
							<div>
								<p class="mb-2 text-xs font-black text-[var(--color-muted)] uppercase">
									Puzzle Outcomes
								</p>
								<div class="flex flex-wrap gap-2">
									{#each comp.creatorQuestions as q (q.orderIndex)}
										<div
											class="flex h-9 w-9 items-center justify-center border-2 border-[var(--color-border)] text-sm font-black shadow-[2px_2px_0_0_var(--color-border)] {q.isCorrect
												? 'bg-green-500 text-white'
												: 'bg-red-500 text-white'}"
											title={`Question ${q.orderIndex + 1}: ${q.isCorrect ? 'Correct' : 'Incorrect'}`}
										>
											{q.isCorrect ? '✓' : '✕'}
										</div>
									{/each}
								</div>
							</div>
						</div>
					</Card>

					<!-- Participant Card -->
					{#if comp.userParticipant}
						{@const p = comp.userParticipant}
						<Card title={`Your Result: ${p.displayName}`} tone="default">
							<div class="grid gap-4">
								<div>
									<p class="text-xs font-black text-[var(--color-muted)] uppercase">
										Reasoning Score
									</p>
									<p class="text-5xl font-black text-[var(--color-foreground)]">{p.score ?? 0}</p>
								</div>

								<div class="grid grid-cols-2 gap-3">
									<div class="border-2 border-[var(--color-border)] bg-white p-3">
										<p class="text-xs font-black text-[var(--color-muted)] uppercase">Accuracy</p>
										<p class="text-xl font-black text-[var(--color-foreground)]">
											{formatPercent(p.accuracy ?? 0, locale)}
										</p>
									</div>
									<div class="border-2 border-[var(--color-border)] bg-white p-3">
										<p class="text-xs font-black text-[var(--color-muted)] uppercase">Total Time</p>
										<p class="text-xl font-black text-[var(--color-foreground)]">
											{formatSeconds(p.totalTimeSeconds ?? 0, locale)}
										</p>
									</div>
								</div>

								<div class="border-2 border-[var(--color-border)] bg-[var(--color-background)] p-3">
									<p class="text-xs font-bold text-[var(--color-muted)]">
										Duel sessions are unrated. No competitive Logic Rating or rank was altered.
									</p>
								</div>
							</div>
						</Card>
					{:else}
						<Card title="Invite Others to Compete" tone="default">
							<div class="grid gap-4">
								<p class="text-sm text-[var(--color-muted)]">
									As the creator, you can invite more opponents to solve your puzzle set and compete
									for top rank on this duel leaderboard.
								</p>
								<div>
									<Button variant="primary" onclick={handleCopyLink}>
										{copied ? 'Link Copied! ✓' : 'Copy Duel Link'}
									</Button>
								</div>
							</div>
						</Card>
					{/if}
				</div>

				<!-- Head-to-Head Puzzle Outcome Matrix -->
				{#if comp.questionMatrix && comp.questionMatrix.length > 0}
					<Card title="Head-to-Head Puzzle Breakdown" tone="default">
						<div class="grid gap-3">
							<p class="text-xs font-bold text-[var(--color-muted)]">
								Question-by-question comparative breakdown. Identical puzzle seed and time limits.
							</p>
							<div class="overflow-x-auto">
								<table class="w-full border-collapse text-left" aria-label="Puzzle Outcome Matrix">
									<thead>
										<tr class="border-b-2 border-[var(--color-border)]">
											<th class="px-3 py-2 text-xs font-black text-[var(--color-muted)] uppercase"
												>Puzzle</th
											>
											<th class="px-3 py-2 text-xs font-black text-[var(--color-muted)] uppercase">
												{comp.creatorDisplayName} (Challenger)
											</th>
											{#if comp.userParticipant}
												<th
													class="px-3 py-2 text-xs font-black text-[var(--color-muted)] uppercase"
												>
													{comp.userParticipant.displayName} (You)
												</th>
												<th
													class="px-3 py-2 text-right text-xs font-black text-[var(--color-muted)] uppercase"
												>
													Point Outcome
												</th>
											{/if}
										</tr>
									</thead>
									<tbody class="divide-y-2 divide-[var(--color-border)]">
										{#each comp.questionMatrix as item (item.orderIndex)}
											<tr>
												<td class="px-3 py-2.5 text-sm font-black">
													Puzzle #{item.orderIndex + 1}
												</td>
												<td class="px-3 py-2.5 text-sm font-bold">
													<span
														class="inline-flex h-7 w-7 items-center justify-center border-2 border-[var(--color-border)] font-black shadow-[1px_1px_0_0_var(--color-border)] {item.creatorCorrect
															? 'bg-green-500 text-white'
															: 'bg-red-500 text-white'}"
													>
														{item.creatorCorrect ? '✓' : '✕'}
													</span>
												</td>
												{#if comp.userParticipant}
													<td class="px-3 py-2.5 text-sm font-bold">
														{#if item.participantCorrect !== null}
															<span
																class="inline-flex h-7 w-7 items-center justify-center border-2 border-[var(--color-border)] font-black shadow-[1px_1px_0_0_var(--color-border)] {item.participantCorrect
																	? 'bg-green-500 text-white'
																	: 'bg-red-500 text-white'}"
															>
																{item.participantCorrect ? '✓' : '✕'}
															</span>
														{:else}
															<span class="text-xs text-[var(--color-muted)]">—</span>
														{/if}
													</td>
													<td class="px-3 py-2.5 text-right text-xs font-black">
														{#if item.participantCorrect === null}
															<span class="text-[var(--color-muted)]">—</span>
														{:else if item.creatorCorrect && item.participantCorrect}
															<span class="text-green-700">Both Solved</span>
														{:else if !item.creatorCorrect && !item.participantCorrect}
															<span class="text-[var(--color-muted)]">Both Missed</span>
														{:else if !item.creatorCorrect && item.participantCorrect}
															<span class="font-black text-green-600">+1 Point You! 🎯</span>
														{:else}
															<span class="font-bold text-amber-700">+1 Challenger</span>
														{/if}
													</td>
												{/if}
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					</Card>
				{/if}

				<!-- Standings Table -->
				<Card title={t('duel.standingsTitle')} tone="default">
					<div class="overflow-x-auto">
						<table class="w-full border-collapse text-left" aria-label="Duel Contender Standings">
							<thead>
								<tr class="border-b-3 border-[var(--color-border)]">
									<th class="px-3 py-2 text-xs font-black text-[var(--color-muted)] uppercase"
										>Rank</th
									>
									<th class="px-3 py-2 text-xs font-black text-[var(--color-muted)] uppercase"
										>Contender</th
									>
									<th
										class="px-3 py-2 text-right text-xs font-black text-[var(--color-muted)] uppercase"
										>Score</th
									>
									<th
										class="px-3 py-2 text-right text-xs font-black text-[var(--color-muted)] uppercase"
										>Accuracy</th
									>
									<th
										class="px-3 py-2 text-right text-xs font-black text-[var(--color-muted)] uppercase"
										>Time</th
									>
								</tr>
							</thead>
							<tbody class="divide-y-2 divide-[var(--color-border)]">
								{#each comp.standings as contender, index (contender.displayName + '-' + index)}
									<tr class={contender.isCreator ? 'bg-amber-50/60' : ''}>
										<td class="px-3 py-3 text-sm font-black">
											#{index + 1}
										</td>
										<td class="px-3 py-3 text-sm font-bold">
											{contender.displayName}
											{#if contender.isCreator}
												<span
													class="ml-2 inline-block rounded border border-[var(--color-border)] bg-[var(--color-accent,#f59e0b)] px-1.5 py-0.5 text-xs font-black"
												>
													Challenger
												</span>
											{/if}
										</td>
										<td class="px-3 py-3 text-right text-sm font-black">
											{contender.score}
										</td>
										<td class="px-3 py-3 text-right text-sm font-bold">
											{formatPercent(contender.accuracy, locale)}
										</td>
										<td class="px-3 py-3 text-right text-sm font-bold">
											{formatSeconds(contender.totalTimeSeconds, locale)}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</Card>

				<!-- Footer CTAs -->
				<div
					class="flex flex-wrap items-center justify-between gap-4 border-t-2 border-[var(--color-border)] pt-4"
				>
					<div class="flex flex-wrap items-center gap-3">
						<Button href="/challenge" variant="primary">Play Standard Challenge</Button>
						<Button variant="secondary" onclick={handleCopyLink}>
							{copied ? 'Invite Link Copied! ✓' : 'Copy Duel Link'}
						</Button>
					</div>

					{#if comp.isCreator && !revoked}
						<Button variant="ghost" onclick={handleRevoke} disabled={revoking}>
							{revoking ? 'Revoking...' : 'Revoke Duel'}
						</Button>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</PublicShell>
