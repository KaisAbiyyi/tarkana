<script lang="ts">
	import gsap from 'gsap';
	import type { ActionData, PageData } from './$types';
	import RankBadge from '$lib/components/primitives/RankBadge.svelte';
	import Button from '$lib/components/primitives/Button.svelte';
	import Input from '$lib/components/primitives/Input.svelte';
	import PlayerPublicIdentity from '$lib/components/primitives/PlayerPublicIdentity.svelte';
	import { formatPercent, labelRank } from '$lib/shared/presentation/format';
	import { calculateRankProgress } from '$lib/shared/constants/rank';
	import { enhance } from '$app/forms';
	import { getI18nContext } from '$lib/i18n/context';

	type Props = {
		data: PageData;
		form?: ActionData;
	};

	let { data, form }: Props = $props();
	const { locale, t } = getI18nContext();
	let profile = $derived(form?.profile ?? data.profile);
	let stats = $derived(data.stats);

	let providerRaw = $derived(data.user?.app_metadata?.provider ?? 'email');
	let provider = $derived(providerRaw.charAt(0).toUpperCase() + providerRaw.slice(1));
	let email = $derived(data.user?.email);

	// Display Name form states
	// svelte-ignore state_referenced_locally
	let displayNameInput = $state(profile.displayName);
	let isSubmitting = $state(false);

	// Reset input when profile changes from outside (e.g. after successful save and page invalidation)
	$effect(() => {
		if (!isSubmitting && form?.success) {
			displayNameInput = profile.displayName;
		}
	});

	let isDisplayNameChanged = $derived(displayNameInput.trim() !== profile.displayName);
	let isDisplayNameValid = $derived(
		displayNameInput.trim().length >= 2 && displayNameInput.trim().length <= 32
	);
	let canSubmit = $derived(isDisplayNameChanged && isDisplayNameValid && !isSubmitting);

	let rankProgress = $derived(calculateRankProgress(profile.rating, profile.rank));

	function animateFeedback(node: HTMLElement) {
		const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (!isReducedMotion) {
			gsap.fromTo(
				node,
				{ opacity: 0, y: -10 },
				{ opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
			);
		}
	}

	function animateCard(node: HTMLElement) {
		const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (!isReducedMotion) {
			gsap.fromTo(
				node,
				{ opacity: 0, scale: 0.98 },
				{ opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out' }
			);
		}
	}
</script>

<svelte:head>
	<title>{t('profile.title')}</title>
	<meta name="description" content={t('profile.meta')} />
</svelte:head>

<section class="grid gap-8">
	<header>
		<p class="page-kicker">{t('profile.kicker')}</p>
		<h1 class="page-title mt-1 text-3xl sm:text-4xl">{t('profile.heading')}</h1>
		<p class="mt-3 max-w-2xl text-lg font-semibold text-[var(--color-muted)]">
			{t('profile.intro')}
		</p>
	</header>

	<div class="grid items-start gap-8 lg:grid-cols-[13fr_12fr]">
		<!-- Mobile layout: summary first. Desktop: editor left, summary right -->
		<div class="order-2 grid gap-8 lg:order-1">
			<section class="grid gap-4">
				<h2 class="text-xl font-black">{t('profile.publicIdentity')}</h2>
				<div
					class="border-[3px] border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-hard-sm)] lg:p-7"
				>
					<form
						class="grid gap-6"
						method="POST"
						action="?/updateDisplayName"
						use:enhance={() => {
							isSubmitting = true;
							return async ({ update }) => {
								await update({ reset: false });
								isSubmitting = false;
							};
						}}
					>
						<div class="grid gap-3 border-b-2 border-dashed border-[var(--color-border)] pb-6">
							<p class="text-[10px] font-black text-[var(--color-muted)] uppercase">
								{t('profile.leaderboardDisplay')}
							</p>
							<div class="flex flex-wrap items-center gap-2">
								<PlayerPublicIdentity
									displayName={displayNameInput.trim() || profile.displayName}
									publicDiscriminator={profile.publicDiscriminator}
									class="text-xl font-black break-all"
								/>
								<span class="text-[var(--color-muted)]" aria-hidden="true">&middot;</span>
								<RankBadge rank={profile.rank} />
							</div>
						</div>

						{#if form?.message}
							{#if !form.success}
								<div
									use:animateFeedback
									class="flex items-center gap-2 border-2 border-red-800 bg-red-100 p-3 text-sm font-bold text-red-900"
									role="alert"
								>
									<svg
										class="h-5 w-5 flex-shrink-0"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="2"
										><path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
										/></svg
									>
									<span>{form.message}</span>
								</div>
							{:else}
								<div
									use:animateFeedback
									class="flex items-center gap-2 border-2 border-green-800 bg-green-100 p-3 text-sm font-bold text-green-900"
									role="status"
								>
									<svg
										class="h-5 w-5 flex-shrink-0"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="2"
										><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg
									>
									<span>{form.message}</span>
								</div>
							{/if}
						{/if}

						<div class="grid gap-2">
							<Input
								id="displayName"
								name="displayName"
								label={t('auth.displayName')}
								bind:value={displayNameInput}
								required
								minlength={2}
								maxlength={32}
								disabled={isSubmitting}
								aria-describedby="displayName-help"
							/>
							<p id="displayName-help" class="text-xs font-bold text-[var(--color-muted)]">
								{t('profile.displayNameHelp')}
							</p>
						</div>

						<div class="flex flex-col items-start gap-2 pt-2">
							<Button type="submit" disabled={!canSubmit}>
								{isSubmitting ? t('profile.saving') : t('profile.saveChanges')}
							</Button>
							{#if !isSubmitting && !isDisplayNameChanged}
								<p class="text-xs font-bold text-[var(--color-muted)]">
									{t('profile.noChanges')}
								</p>
							{/if}
						</div>
					</form>
				</div>
			</section>
		</div>

		<div class="order-1 grid gap-8 lg:order-2">
			<section class="grid gap-4 lg:sticky lg:top-24">
				<h2 class="text-xl font-black">{t('profile.playerSummary')}</h2>
				<article
					use:animateCard
					class="flex flex-col gap-6 border-[3px] border-[var(--color-border)] bg-[var(--color-primary)] p-6 shadow-[var(--shadow-hard)] lg:p-7"
				>
					<div
						class="flex flex-wrap items-start justify-between gap-4 border-b-2 border-dashed border-[var(--color-border)] pb-6"
					>
						<div class="grid min-w-[50%] gap-2">
							<h3 class="text-2xl leading-tight font-black break-words">{profile.displayName}</h3>
							<div><RankBadge rank={profile.rank} /></div>
						</div>
						<div class="text-right">
							<div class="text-xs font-black text-[var(--color-muted)] uppercase">Logic Rating</div>
							<div class="text-4xl font-black">{profile.rating}</div>
						</div>
					</div>

					{#if rankProgress}
						<div class="grid gap-2">
							<div class="flex justify-between text-[10px] font-black uppercase">
								<span>{t('leaderboard.rank')}</span>
								<span class="text-[var(--color-muted)]"
									>{t('profile.needRating', { count: rankProgress.remaining })}</span
								>
							</div>
							<div
								class="h-3 w-full border-2 border-[var(--color-border)] bg-white/50 p-0.5"
								role="progressbar"
								aria-valuenow={Math.round(rankProgress.percentage)}
								aria-valuemin="0"
								aria-valuemax="100"
								aria-label={t('profile.progressTo', {
									rank: labelRank(rankProgress.nextRankName ?? profile.rank, locale)
								})}
							>
								<div
									class="h-full bg-[var(--color-accent)] transition-all duration-500"
									style="width: {rankProgress.percentage}%"
								></div>
							</div>
							<div class="text-right text-[10px] font-bold text-[var(--color-muted)] uppercase">
								{t('profile.toward', {
									rank: labelRank(rankProgress.nextRankName ?? profile.rank, locale)
								})}
							</div>
						</div>
					{/if}

					<dl class="mt-2 grid grid-cols-2 gap-4">
						<div
							class="border-2 border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-hard-sm)]"
						>
							<dt class="text-[10px] font-black text-[var(--color-muted)] uppercase">
								{t('leaderboard.accuracy')}
							</dt>
							<dd class="mt-1 text-2xl font-black">
								{typeof stats?.averageAccuracy === 'number'
									? formatPercent(stats.averageAccuracy, locale)
									: '-'}
							</dd>
						</div>
						<div
							class="border-2 border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-hard-sm)]"
						>
							<dt class="text-[10px] font-black text-[var(--color-muted)] uppercase">
								{t('leaderboard.completedRounds')}
							</dt>
							<dd class="mt-1 text-2xl font-black">
								{typeof stats?.totalCompleted === 'number' ? stats.totalCompleted : '-'}
							</dd>
						</div>
					</dl>
				</article>
			</section>
		</div>
	</div>

	<section class="grid gap-4">
		<h2 class="text-xl font-black">{t('profile.accountInfo')}</h2>
		<div
			class="border-[3px] border-[var(--color-border)] bg-[var(--color-paper)] p-6 shadow-[var(--shadow-hard-sm)] lg:p-7"
		>
			<p class="mb-6 text-sm font-bold text-[var(--color-muted)]">
				{t('profile.privateInfo')}
			</p>
			<dl class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				<div
					class="flex flex-col gap-1 border-t-2 border-dashed border-[var(--color-border)] pt-4 sm:border-t-0 sm:border-l-[3px] sm:pt-0 sm:pl-5"
				>
					<dt class="text-xs font-black text-[var(--color-muted)] uppercase">
						{t('profile.signInMethod')}
					</dt>
					<dd class="text-lg font-black">{provider}</dd>
				</div>
				{#if email}
					<div
						class="flex flex-col gap-1 border-t-2 border-dashed border-[var(--color-border)] pt-4 sm:border-t-0 sm:border-l-[3px] sm:pt-0 sm:pl-5"
					>
						<dt class="text-xs font-black text-[var(--color-muted)] uppercase">
							{t('common.email')}
						</dt>
						<dd class="text-lg font-black break-all">{email}</dd>
					</div>
				{/if}
				{#if profile.role === 'admin'}
					<div
						class="flex flex-col items-start gap-1 border-t-2 border-dashed border-[var(--color-border)] pt-4 sm:col-span-2 sm:border-t-0 sm:pt-0 lg:col-span-1 lg:border-l-[3px] lg:pl-5"
					>
						<dt class="text-xs font-black text-[var(--color-muted)] uppercase">
							{t('profile.role')}
						</dt>
						<dd
							class="mt-1 inline-flex border-2 border-[var(--color-border)] bg-[var(--color-primary)] px-2 py-0.5 text-xs font-black uppercase"
						>
							{t('common.admin')}
						</dd>
					</div>
				{/if}
			</dl>
		</div>
	</section>
</section>
