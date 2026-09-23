<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/primitives/Button.svelte';
	import { getI18nContext } from '$lib/i18n/context';
	import { analytics } from '$lib/client/analytics';
	import type { ChallengeType } from '$lib/shared/constants/challenge';
	import { labelChallengeType } from '$lib/shared/presentation/format';

	type QuestionReview = {
		orderIndex: number;
		isCorrect: boolean;
	};

	type Props = {
		isOpen: boolean;
		onClose: () => void;
		sessionId: string;
		publicId: string;
		shareUrl: string;
		analyticsShareId?: string;
		totalScore: number;
		accuracy: number;
		totalTimeSeconds: number;
		logicRank: string;
		challengeType: ChallengeType;
		challengeDate?: string;
		questions: QuestionReview[];
	};

	let {
		isOpen,
		onClose,
		sessionId,
		publicId,
		shareUrl,
		analyticsShareId,
		totalScore,
		accuracy,
		totalTimeSeconds,
		logicRank,
		challengeType,
		challengeDate,
		questions
	}: Props = $props();

	const { locale, t } = getI18nContext();

	let linkCopied = $state(false);
	let textCopied = $state(false);
	let canNativeShare = $state(false);

	onMount(() => {
		canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;
	});

	let isDaily = $derived(challengeType === 'daily');

	// Construct Wordle-style emoji grid
	let emojiGrid = $derived.by(() => {
		const sorted = [...questions].sort((a, b) => a.orderIndex - b.orderIndex);
		const tiles = sorted.map((q) => (q.isCorrect ? '🟩' : '🟥')).join('');
		const correct = sorted.filter((q) => q.isCorrect).length;
		return `${tiles} (${correct}/${sorted.length})`;
	});

	let formattedSummaryText = $derived.by(() => {
		const modeHeader = isDaily
			? `Tarkana Daily • ${challengeDate ?? ''}`
			: `Tarkana ${labelChallengeType(challengeType, locale)} Challenge`;
		return [
			modeHeader,
			`🎯 Reasoning Score: ${totalScore} pts`,
			`⚡ Accuracy: ${Math.round(accuracy)}%`,
			`⏱️ Total Time: ${totalTimeSeconds}s`,
			`🧠 Logic Rank: ${logicRank}`,
			emojiGrid,
			'',
			`Can you beat my score? ${shareUrl}`
		].join('\n');
	});

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(shareUrl);
			linkCopied = true;
			setTimeout(() => (linkCopied = false), 2500);
			analytics.track('result_shared', {
				session_id: sessionId,
				platform: 'clipboard_link',
				score: totalScore,
				share_id: analyticsShareId ?? publicId
			});
		} catch {
			/* ignore */
		}
	}

	async function copyTextSummary() {
		try {
			await navigator.clipboard.writeText(formattedSummaryText);
			textCopied = true;
			setTimeout(() => (textCopied = false), 2500);
			analytics.track('result_shared', {
				session_id: sessionId,
				platform: 'clipboard_text',
				score: totalScore,
				share_id: analyticsShareId ?? publicId
			});
		} catch {
			/* ignore */
		}
	}

	async function handleNativeShare() {
		if (typeof navigator !== 'undefined' && navigator.share) {
			try {
				await navigator.share({
					title: 'Tarkana Challenge Result',
					text: formattedSummaryText,
					url: shareUrl
				});
				analytics.track('result_shared', {
					session_id: sessionId,
					platform: 'native_share',
					score: totalScore,
					share_id: analyticsShareId ?? publicId
				});
				return;
			} catch {
				/* ignore */
			}
		}
		await copyLink();
	}

	function handleSocialClick(platform: 'twitter' | 'whatsapp' | 'linkedin') {
		analytics.track('result_shared', {
			session_id: sessionId,
			platform,
			score: totalScore,
			share_id: analyticsShareId ?? publicId
		});
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
		role="dialog"
		aria-modal="true"
		aria-labelledby="share-modal-title"
	>
		<div
			class="relative w-full max-w-lg border-[3px] border-[var(--color-border)] bg-[#fffdfa] p-6 shadow-[8px_8px_0px_#1c1917]"
		>
			<!-- Close button -->
			<button
				type="button"
				class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center border-2 border-[var(--color-border)] bg-white text-lg font-black hover:bg-neutral-100"
				onclick={onClose}
				aria-label="Close share dialog"
			>
				✕
			</button>

			<header class="mb-4 pr-8">
				<h2 id="share-modal-title" class="text-2xl font-black text-[var(--color-foreground)]">
					{t('share.shareModalTitle')}
				</h2>
				<p class="mt-1 text-sm font-bold text-[var(--color-muted)]">
					{t('share.shareModalSubtitle')}
				</p>
			</header>

			<div class="grid gap-4">
				<!-- Share Link Input -->
				<div>
					<label
						for="share-link-input"
						class="mb-1 block text-xs font-black text-[var(--color-muted)] uppercase"
					>
						{t('share.copyLink')}
					</label>
					<div class="flex gap-2">
						<input
							id="share-link-input"
							type="text"
							readonly
							value={shareUrl}
							class="flex-1 border-2 border-[var(--color-border)] bg-neutral-50 px-3 py-2 text-sm font-bold select-all"
						/>
						<Button onclick={copyLink} variant="secondary">
							{linkCopied ? t('share.copied') : t('share.copyLink')}
						</Button>
					</div>
				</div>

				<!-- Formatted Text Summary Box -->
				<div>
					<label
						for="share-text-box"
						class="mb-1 block text-xs font-black text-[var(--color-muted)] uppercase"
					>
						Wordle-Style Text Summary
					</label>
					<div class="relative">
						<textarea
							id="share-text-box"
							readonly
							rows="5"
							value={formattedSummaryText}
							class="w-full resize-none border-2 border-[var(--color-border)] bg-neutral-50 p-3 font-mono text-xs font-bold select-all"
						></textarea>
						<div class="mt-1 flex justify-end">
							<Button onclick={copyTextSummary} variant="primary">
								{textCopied ? t('share.copied') : t('share.copyText')}
							</Button>
						</div>
					</div>
				</div>

				<!-- Social Sharing Intents Row -->
				<div>
					<p class="mb-2 text-xs font-black text-[var(--color-muted)] uppercase">Direct Share</p>
					<div class="flex flex-wrap gap-2">
						<a
							href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(formattedSummaryText)}`}
							target="_blank"
							rel="noopener noreferrer"
							onclick={() => handleSocialClick('twitter')}
							class="inline-flex items-center gap-1.5 border-2 border-[var(--color-border)] bg-black px-3 py-2 text-xs font-black text-white hover:bg-neutral-800"
						>
							<span>𝕏</span>
							{t('share.shareOnX')}
						</a>
						<a
							href={`https://api.whatsapp.com/send?text=${encodeURIComponent(formattedSummaryText)}`}
							target="_blank"
							rel="noopener noreferrer"
							onclick={() => handleSocialClick('whatsapp')}
							class="inline-flex items-center gap-1.5 border-2 border-[var(--color-border)] bg-[#25D366] px-3 py-2 text-xs font-black text-black hover:opacity-90"
						>
							💬 {t('share.shareOnWhatsApp')}
						</a>
						<a
							href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
							target="_blank"
							rel="noopener noreferrer"
							onclick={() => handleSocialClick('linkedin')}
							class="inline-flex items-center gap-1.5 border-2 border-[var(--color-border)] bg-[#0077b5] px-3 py-2 text-xs font-black text-white hover:opacity-90"
						>
							<span>in</span>
							{t('share.shareOnLinkedIn')}
						</a>
						<a
							href={`/api/og/share/${publicId}.png?download=1`}
							class="inline-flex items-center gap-1.5 border-2 border-[var(--color-border)] bg-white px-3 py-2 text-xs font-black text-[var(--color-foreground)] shadow-[2px_2px_0px_#1c1917] hover:bg-neutral-50"
						>
							🖼️ {t('share.downloadCard')}
						</a>
						{#if canNativeShare}
							<button
								type="button"
								onclick={handleNativeShare}
								class="inline-flex items-center gap-1.5 border-2 border-[var(--color-border)] bg-[var(--color-accent)] px-3 py-2 text-xs font-black text-black hover:opacity-90"
							>
								📱 More Options
							</button>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
