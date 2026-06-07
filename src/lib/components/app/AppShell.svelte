<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { ProfileSummary } from '$lib/shared/types/auth';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import Button from '$lib/components/primitives/Button.svelte';

	type Props = {
		children?: Snippet;
		profile: ProfileSummary;
		section?: 'app' | 'admin';
	};

	let { children, profile, section = 'app' }: Props = $props();

	const appLinks = [
		{ href: '/dashboard', label: 'Dashboard' },
		{ href: '/challenge', label: 'Challenge' },
		{ href: '/history', label: 'History' },
		{ href: '/leaderboard', label: 'Leaderboard' },
		{ href: '/profile', label: 'Profile' }
	] as const;

	const adminLinks = [
		{ href: '/admin', label: 'Overview' },
		{ href: '/admin/categories', label: 'Categories' },
		{ href: '/admin/question-rules', label: 'Rules' },
		{ href: '/admin/challenge-configs', label: 'Configs' },
		{ href: '/admin/sessions', label: 'Sessions' }
	] as const;

	let links = $derived(section === 'admin' ? adminLinks : appLinks);
	let activePath = $derived(page.url.pathname);
</script>

<div class="min-h-screen pb-10">
	<a class="sr-only focus:not-sr-only" href="#main-content">Skip to main content</a>
	<header
		class="sticky top-0 z-30 border-b-[3px] border-[var(--color-border)] bg-white/95 backdrop-blur"
	>
		<div class="page-shell grid gap-4 py-3 lg:grid-cols-[auto_1fr_auto] lg:items-center">
			<div class="flex items-center gap-3">
				<a
					class="flex items-center gap-2 text-2xl font-black no-underline"
					href={resolve('/dashboard')}
				>
					<span
						class="grid h-9 w-9 place-items-center border-[3px] border-[var(--color-border)] bg-[var(--color-primary)] shadow-[var(--shadow-hard-sm)]"
						aria-hidden="true">T</span
					>
					Tarkana
				</a>
				<Badge tone={section === 'admin' ? 'warning' : 'accent'}>
					{section === 'admin' ? 'Admin' : profile.rank}
				</Badge>
			</div>

			<nav
				class="flex flex-wrap items-center gap-2"
				aria-label={section === 'admin' ? 'Admin navigation' : 'App navigation'}
			>
				{#each links as link (link.href)}
					{@const isActive =
						activePath === link.href ||
						(link.href !== '/dashboard' && activePath.startsWith(link.href))}
					<a
						class={`border-2 border-[var(--color-border)] px-3 py-2 text-sm font-black no-underline transition-transform hover:-translate-y-0.5 ${
							isActive
								? 'bg-[var(--color-primary)] shadow-[var(--shadow-hard-sm)]'
								: 'bg-[var(--color-paper)]'
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
						Admin
					</a>
				{/if}
			</nav>

			<div class="flex flex-wrap items-center gap-3 lg:justify-end">
				<div
					class="min-w-0 border-l-[3px] border-[var(--color-border)] pl-3 leading-tight"
					aria-label="Current profile summary"
				>
					<p class="truncate text-sm font-black">{profile.displayName}</p>
					<p class="text-xs font-bold text-[var(--color-muted)]">Logic Rating {profile.rating}</p>
				</div>
				<form method="POST" action="/auth/logout">
					<Button type="submit" size="sm" variant="ghost">Logout</Button>
				</form>
			</div>
		</div>
	</header>

	<main id="main-content" class="page-shell py-8 md:py-10">
		{@render children?.()}
	</main>
</div>
