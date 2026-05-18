<script lang="ts">
	import type { PageData } from './$types';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import Button from '$lib/components/primitives/Button.svelte';
	import Card from '$lib/components/primitives/Card.svelte';
	import {
		formatDateTime,
		formatPercent,
		formatSeconds,
		formatSignedNumber,
		labelChallengeType,
		labelSessionStatus
	} from '$lib/shared/presentation/format';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();
	let history = $derived(data.history);
</script>

<section class="grid gap-8">
	<header>
		<p class="font-black text-[var(--color-muted)] uppercase">Private history</p>
		<h1 class="text-4xl font-black sm:text-5xl">Challenge History</h1>
		<p class="mt-2 max-w-2xl font-semibold text-[var(--color-muted)]">
			Hanya session milik akun ini yang dimuat dari server.
		</p>
	</header>

	<Card title="Sessions">
		{#if history.items.length === 0}
			<div class="border-2 border-dashed border-[var(--color-border)] bg-[var(--color-paper)] p-5">
				<p class="font-black">Belum ada history.</p>
				<p class="mb-4 text-sm font-semibold text-[var(--color-muted)]">
					Selesaikan challenge untuk melihat Reasoning Score dan Rank Progress.
				</p>
				<Button href="/challenge">Start Challenge</Button>
			</div>
		{:else}
			<div class="grid gap-4">
				{#each history.items as session (session.id)}
					<article
						class="grid gap-4 border-[3px] border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-hard-sm)] lg:grid-cols-[1fr_auto] lg:items-center"
					>
						<div>
							<div class="mb-2 flex flex-wrap gap-2">
								<Badge tone="accent">{labelChallengeType(session.challengeType)}</Badge>
								<Badge tone={session.status === 'suspicious' ? 'danger' : 'warning'}>
									{labelSessionStatus(session.status)}
								</Badge>
							</div>
							<h2 class="text-xl font-black">{formatDateTime(session.createdAt)}</h2>
							<p class="font-semibold text-[var(--color-muted)]">
								{session.totalQuestions} questions, {formatSeconds(session.averageTimeSeconds)} avg, rank
								after {session.rankAfter}
							</p>
						</div>
						<div class="flex flex-wrap items-center gap-2">
							<Badge tone="warning">{session.totalScore} pts</Badge>
							<Badge tone="accent">{formatPercent(session.accuracy)}</Badge>
							<Badge tone={session.ratingDelta >= 0 ? 'success' : 'danger'}>
								{formatSignedNumber(session.ratingDelta)}
							</Badge>
							<Button href={`/result/${session.id}`} size="sm" variant="ghost">Detail</Button>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</Card>
</section>
