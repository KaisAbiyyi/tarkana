<script lang="ts">
	import { resolve } from '$app/paths';
	import type { DashboardRecentSessionDto } from '$lib/shared/types/dashboard';
	import {
		formatDateTime,
		formatPercent,
		labelChallengeType
	} from '$lib/shared/presentation/format';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import { getI18nContext } from '$lib/i18n/context';

	type Props = {
		sessions: DashboardRecentSessionDto[];
	};

	let { sessions }: Props = $props();
	const { locale, t } = getI18nContext();
</script>

{#if sessions.length === 0}
	<div class="border-2 border-dashed border-[var(--color-border)] bg-[var(--color-paper)] p-5">
		<p class="font-black">{t('dashboard.noSessions')}</p>
		<p class="text-sm font-semibold text-[var(--color-muted)]">
			{t('dashboard.firstAppears')}
		</p>
	</div>
{:else}
	<ul class="grid gap-3">
		{#each sessions.slice(0, 5) as session (session.id)}
			<li
				class="flex flex-wrap items-center justify-between gap-3 border-2 border-[var(--color-border)] bg-white p-4"
			>
				<div>
					<p class="font-black">{labelChallengeType(session.challengeType, locale)}</p>
					<p class="text-sm font-semibold text-[var(--color-muted)]">
						{formatDateTime(session.createdAt, locale)}
					</p>
				</div>
				<div class="flex items-center gap-2">
					<Badge tone="warning">{t('dashboard.points', { value: session.totalScore })}</Badge>
					<Badge tone="accent">{formatPercent(session.accuracy, locale)}</Badge>
				</div>
			</li>
		{/each}
	</ul>

	<div class="mt-4 border-t-2 border-[var(--color-border)] pt-4">
		<a href={resolve('/history')} class="font-bold underline hover:text-[var(--color-primary)]"
			>{t('dashboard.viewHistory')}</a
		>
	</div>
{/if}
