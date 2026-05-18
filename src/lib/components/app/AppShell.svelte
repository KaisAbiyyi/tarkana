<script lang="ts">
	import type { Snippet } from 'svelte';
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
</script>

<div class="min-h-screen pb-10">
	<header class="border-b-[3px] border-[var(--color-border)] bg-white">
		<div class="page-shell grid gap-4 py-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
			<div class="flex items-center gap-3">
				<a class="text-2xl font-black no-underline" href={resolve('/dashboard')}>Tarkana</a>
				<Badge tone={section === 'admin' ? 'warning' : 'accent'}>
					{section === 'admin' ? 'Admin' : profile.rank}
				</Badge>
			</div>

			<nav
				class="flex flex-wrap items-center gap-2"
				aria-label={section === 'admin' ? 'Admin navigation' : 'App navigation'}
			>
				{#each links as link (link.href)}
					<a
						class="border-2 border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-2 text-sm font-black no-underline hover:bg-[var(--color-primary)]"
						href={resolve(link.href)}
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

			<div class="flex items-center gap-3">
				<div class="min-w-0">
					<p class="truncate text-sm font-black">{profile.displayName}</p>
					<p class="text-xs font-bold text-[var(--color-muted)]">Logic Rating {profile.rating}</p>
				</div>
				<form method="POST" action="/auth/logout">
					<Button type="submit" size="sm" variant="ghost">Logout</Button>
				</form>
			</div>
		</div>
	</header>

	<main class="page-shell mt-8">
		{@render children?.()}
	</main>
</div>
