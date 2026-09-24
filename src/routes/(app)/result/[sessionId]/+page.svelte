<script lang="ts">
	import type { PageData } from './$types';
	import Button from '$lib/components/primitives/Button.svelte';
	import QuestionReviewList, {
		type ReviewFilter
	} from '$lib/components/result/QuestionReviewList.svelte';
	import RoundCategoryBreakdown from '$lib/components/result/RoundCategoryBreakdown.svelte';
	import ResultSummary from '$lib/components/result/ResultSummary.svelte';
	import ShareResultModal from '$lib/components/result/ShareResultModal.svelte';
	import { getI18nContext } from '$lib/i18n/context';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { analytics } from '$lib/client/analytics';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();
	const { t } = getI18nContext();
	let result = $derived(data.result);

	let isShareModalOpen = $state(false);
	let isCreatingShare = $state(false);
	let isCreatingDuel = $state(false);
	let sharePublicId = $state<string | null>(null);
	let shareUrl = $state<string | null>(null);
	let shareAnalyticsId = $state<string | null>(null);

	onMount(() => {
		if (result.canClaim) {
			analytics.track('claim_cta_viewed', {
				session_id: result.sessionId,
				placement: 'result_banner'
			});
		}
	});

	async function handleShare() {
		if (result.isSuspicious) return;
		if (sharePublicId && shareUrl) {
			isShareModalOpen = true;
			return;
		}

		isCreatingShare = true;
		try {
			const res = await fetch('/api/share/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionId: result.sessionId })
			});
			const body = await res.json();
			if (body.ok && body.data) {
				sharePublicId = body.data.publicId;
				shareUrl = body.data.shareUrl;
				shareAnalyticsId = body.data.analyticsShareId;
				isShareModalOpen = true;
			}
		} catch {
			/* ignore */
		} finally {
			isCreatingShare = false;
		}
	}

	async function handleChallengeFriend() {
		if (result.isSuspicious) return;
		isCreatingDuel = true;
		try {
			const res = await fetch('/api/duel/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionId: result.sessionId })
			});
			const body = await res.json();
			if (body.ok && body.data) {
				await goto(`/duel/${body.data.publicId}`);
			}
		} catch {
			/* ignore */
		} finally {
			isCreatingDuel = false;
		}
	}

	function handleReviewFilterChange(filter: ReviewFilter) {
		analytics.track('review_filter_applied', {
			session_id: result.sessionId,
			filter
		});
	}

	function handlePracticeCategory(
		category: string,
		roundAccuracy: number,
		isSingleCategory: boolean
	) {
		analytics.track('practice_weakest_category_clicked', {
			session_id: result.sessionId,
			category,
			round_accuracy: roundAccuracy,
			is_single_category: isSingleCategory
		});
	}
</script>

<svelte:head>
	<title>{t('result.title')}</title>
	<meta name="description" content={t('result.meta')} />
</svelte:head>

<section class="grid gap-8">
	<header class="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
		<div>
			<p class="page-kicker">{t('result.completed')}</p>
			<h1 class="page-title">{t('result.review')}</h1>
		</div>
		<div class="flex flex-wrap gap-3">
			{#if !result.isSuspicious && (result.challengeType === 'standard' || result.challengeType === 'quick')}
				<Button onclick={handleChallengeFriend} variant="primary" disabled={isCreatingDuel}>
					{isCreatingDuel ? 'Creating Duel...' : t('duel.challengeAFriend')}
				</Button>
			{/if}
			{#if !result.isSuspicious}
				<Button onclick={handleShare} variant="secondary" disabled={isCreatingShare}>
					{isCreatingShare ? 'Loading...' : 'Share Result'}
				</Button>
			{/if}
			<Button href="/challenge">{t('result.retry')}</Button>
			<Button href="/leaderboard" variant="secondary">{t('nav.leaderboard')}</Button>
		</div>
	</header>

	{#if result.canClaim}
		<div
			data-testid="guest-claim-banner"
			class="border-[3px] border-[var(--color-border)] bg-[var(--color-primary)] p-6 shadow-[var(--shadow-hard)]"
		>
			<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<span
						class="mb-2 inline-block border-2 border-[var(--color-border)] bg-black px-2 py-0.5 text-xs font-black text-white uppercase"
					>
						{t('challenge.guestMode')}
					</span>
					<h2 class="text-xl font-black text-black">{t('result.saveProgress')}</h2>
					<p class="mt-1 max-w-xl text-sm font-bold text-black/80">
						{t('result.guestClaimPrompt')}
					</p>
				</div>
				<div class="flex shrink-0 flex-wrap gap-2">
					<Button href={`/auth/register?claimSession=${result.sessionId}`}>
						{t('nav.register')}
					</Button>
					<Button href={`/auth/login?claimSession=${result.sessionId}`} variant="secondary">
						{t('nav.login')}
					</Button>
				</div>
			</div>
		</div>
	{/if}

	<ResultSummary
		totalScore={result.totalScore}
		accuracy={result.accuracy}
		correctAnswers={result.correctAnswers}
		wrongAnswers={result.wrongAnswers}
		averageTimeSeconds={result.averageTimeSeconds}
		ratingDelta={result.ratingDelta}
		rankBefore={result.rankBefore}
		rankAfter={result.rankAfter}
		rankPromoted={result.rankPromoted}
		rankProgress={result.rankProgress}
		isSuspicious={result.isSuspicious}
	/>

	<RoundCategoryBreakdown review={result.review} onPracticeClick={handlePracticeCategory} />

	<section class="grid gap-4">
		<h2 class="text-3xl font-black">{t('result.questionReview')}</h2>
		<QuestionReviewList review={result.review} onFilterChange={handleReviewFilterChange} />
	</section>
</section>

{#if isShareModalOpen && sharePublicId && shareUrl}
	<ShareResultModal
		isOpen={isShareModalOpen}
		onClose={() => (isShareModalOpen = false)}
		sessionId={result.sessionId}
		publicId={sharePublicId}
		{shareUrl}
		analyticsShareId={shareAnalyticsId ?? undefined}
		totalScore={result.totalScore}
		accuracy={result.accuracy}
		totalTimeSeconds={result.totalTimeSeconds}
		logicRank={result.rankAfter}
		challengeType={result.challengeType ?? 'standard'}
		challengeDate={result.challengeDate}
		questions={result.review.map((q) => ({
			orderIndex: q.orderIndex,
			isCorrect: q.isCorrect
		}))}
	/>
{/if}
