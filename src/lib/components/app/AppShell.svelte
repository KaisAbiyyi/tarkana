<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { ProfileSummary } from '$lib/shared/types/auth';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import RankBadge from '$lib/components/primitives/RankBadge.svelte';
	import LanguageSelector from '$lib/components/app/LanguageSelector.svelte';
	import BrandLogo from '$lib/components/app/BrandLogo.svelte';
	import { getI18nContext } from '$lib/i18n/context';

	type Props = {
		children?: Snippet;
		profile: ProfileSummary;
		section?: 'app' | 'admin';
	};

	let { children, profile, section = 'app' }: Props = $props();
	const { t } = getI18nContext();

	const appLinks = [
		{ href: '/dashboard', label: t('nav.dashboard') },
		{ href: '/challenge', label: t('nav.challenge') },
		{ href: '/history', label: t('nav.history') },
		{ href: '/leaderboard', label: t('nav.leaderboard') },
		{ href: '/profile', label: t('nav.profile') }
	] as const;

	const adminLinks = [
		{ href: '/admin', label: t('nav.overview') },
		{ href: '/admin/categories', label: t('nav.categories') },
		{ href: '/admin/question-rules', label: t('nav.rules') },
		{ href: '/admin/challenge-configs', label: t('nav.configs') },
		{ href: '/admin/sessions', label: t('nav.sessions') }
	] as const;

	let links = $derived(section === 'admin' ? adminLinks : appLinks);
	let activePath = $derived(page.url.pathname);
	let menuOpen = $state(false);

	$effect(() => {
		// Close menu when path changes
		if (activePath) {
			menuOpen = false;
		}
	});
</script>

<div class="min-h-screen pb-10">
	<a class="sr-only focus:not-sr-only" href="#main-content">{t('common.skipToContent')}</a>
	<header
		class="sticky top-0 z-30 border-b-[3px] border-[var(--color-border)] bg-white/95 backdrop-blur"
	>
		<div
			class="page-shell flex flex-wrap items-center justify-between gap-3 py-3 lg:grid lg:grid-cols-[auto_1fr_auto] lg:gap-4"
		>
			<div class="flex items-center gap-3">
				<BrandLogo href={resolve('/dashboard')} size="sm" text="Tarkana" label="Tarkana dashboard" />
				{#if section === 'admin'}
					<Badge tone="warning">{t('common.admin')}</Badge>
				{:else if profile.rank !== 'Unranked'}
					<RankBadge rank={profile.rank} />
				{/if}
			</div>

			<button
				class="grid h-10 w-10 place-items-center border-2 border-[var(--color-border)] bg-white lg:hidden"
				onclick={() => (menuOpen = !menuOpen)}
				aria-expanded={menuOpen}
				aria-label={t('nav.toggle')}
			>
				<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					{#if menuOpen}
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					{:else}
						<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
					{/if}
				</svg>
			</button>

			<div class={`w-full lg:contents ${menuOpen ? 'block' : 'hidden'}`}>
				<nav
					class="flex flex-col gap-2 pt-2 lg:flex-row lg:flex-wrap lg:items-center lg:pt-0"
					aria-label={section === 'admin' ? t('nav.adminLabel') : t('nav.appLabel')}
				>
					{#each links as link (link.href)}
						{@const isActive =
							activePath === link.href ||
							(link.href !== '/dashboard' && activePath.startsWith(link.href))}
						<a
							class={`border-2 px-3 py-2 text-sm font-black no-underline transition-transform hover:-translate-y-0.5 ${
								isActive
									? 'border-[var(--color-border)] bg-[var(--color-primary)] text-black shadow-[var(--shadow-hard-sm)]'
									: 'border-transparent bg-transparent text-[var(--color-muted)] hover:border-[var(--color-border)] hover:bg-[var(--color-paper)] hover:text-black'
							}`}
							href={resolve(link.href)}
							aria-current={isActive ? 'page' : undefined}
						>
							{link.label}
						</a>
					{/each}
					{#if profile.role === 'admin' && section !== 'admin'}
						<a
							class="border-2 border-[var(--color-border)] bg-[var(--color-primary)] px-3 py-2 text-sm font-black no-underline"
							href={resolve('/admin')}
						>
							{t('common.admin')}
						</a>
					{/if}
				</nav>

				<div
					class="mt-4 flex flex-col gap-3 border-t-2 border-[var(--color-border)] pt-4 lg:mt-0 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end lg:border-none lg:pt-0"
				>
					<LanguageSelector />
					<div
						class="min-w-0 leading-tight lg:border-l-[3px] lg:border-[var(--color-border)] lg:pl-3"
						aria-label={t('nav.profileSummary')}
					>
						<p class="truncate text-sm font-black">{profile.displayName}</p>
						<div class="mt-1 flex items-center gap-2">
							{#if profile.rank !== 'Unranked'}
								<p class="text-xs font-bold text-[var(--color-muted)]">
									{t('common.logicRating')}
									{profile.rating}
								</p>
								<span class="text-xs text-[var(--color-muted)]" aria-hidden="true">&middot;</span>
							{/if}
							<form method="POST" action="/auth/logout" class="inline">
								<button
									type="submit"
									class="text-xs font-bold text-[var(--color-muted)] underline hover:text-black focus-visible:text-black"
									>{t('nav.logout')}</button
								>
							</form>
						</div>
					</div>
				</div>
			</div>
		</div>
	</header>

	<main id="main-content" class="page-shell py-8 md:py-10">
		{@render children?.()}
	</main>
</div>
