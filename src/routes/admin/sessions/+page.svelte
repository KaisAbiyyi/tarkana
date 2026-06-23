<script lang="ts">
	import type { PageData } from './$types';
	import AdminTable from '$lib/components/admin/AdminTable.svelte';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import {
		formatDateTime,
		formatPercent,
		labelChallengeType,
		labelSessionStatus
	} from '$lib/shared/presentation/format';
	import { getI18nContext } from '$lib/i18n/context';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();
	const { locale, t } = getI18nContext();
</script>

<svelte:head>
	<title>{t('admin.sessionMonitoring')} | Tarkana</title>
	<meta name="description" content={t('admin.sessionMeta')} />
</svelte:head>

<section class="grid gap-8">
	<header>
		<h1 class="page-title">{t('admin.sessionMonitoring')}</h1>
		<p class="mt-3 text-lg font-semibold text-[var(--color-muted)]">
			{t('admin.sessionIntro')}
		</p>
	</header>

	<AdminTable title={t('admin.recentSessions')}>
		<table class="w-full min-w-[900px] border-collapse text-left">
			<thead class="bg-[var(--color-primary)]">
				<tr>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">{t('admin.session')}</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">{t('admin.displayName')}</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">{t('admin.type')}</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">{t('admin.score')}</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4"
						>{t('leaderboard.accuracy')}</th
					>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">{t('admin.status')}</th>
					<th class="border-b-[3px] border-[var(--color-border)] p-4">{t('admin.created')}</th>
				</tr>
			</thead>
			<tbody>
				{#each data.sessions.items as session (session.id)}
					<tr class="border-b-2 border-[var(--color-border)] last:border-b-0">
						<td class="p-4 font-mono text-xs">{session.id}</td>
						<td class="p-4 font-black">{session.displayName}</td>
						<td class="p-4 font-bold">{labelChallengeType(session.challengeType, locale)}</td>
						<td class="p-4 font-bold">{session.totalScore}</td>
						<td class="p-4 font-bold">{formatPercent(session.accuracy, locale)}</td>
						<td class="p-4">
							<Badge tone={session.isSuspicious ? 'danger' : 'accent'}>
								{session.isSuspicious
									? t('admin.suspicious')
									: labelSessionStatus(session.status, locale)}
							</Badge>
						</td>
						<td class="p-4 font-semibold">{formatDateTime(session.createdAt, locale)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</AdminTable>
</section>
