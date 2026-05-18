<script lang="ts">
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import Card from '$lib/components/primitives/Card.svelte';
	import StatTile from '$lib/components/dashboard/StatTile.svelte';

	type Props = {
		data: PageData;
	};

	let { data }: Props = $props();
	let overview = $derived(data.overview);
</script>

<section class="grid gap-8">
	<header>
		<p class="font-black text-[var(--color-muted)] uppercase">Web-only admin</p>
		<h1 class="text-4xl font-black sm:text-5xl">Admin Overview</h1>
		<p class="mt-2 max-w-2xl font-semibold text-[var(--color-muted)]">
			Admin panel mengelola kategori, rule generator, konfigurasi challenge, dan monitoring session.
		</p>
	</header>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
		<StatTile label="Categories" value={overview.categoryCount} tone="yellow" />
		<StatTile label="Active Rules" value={overview.activeRuleCount} tone="teal" />
		<StatTile label="Configs" value={overview.challengeConfigCount} />
		<StatTile label="Suspicious" value={overview.suspiciousSessionCount} />
		<StatTile label="Users" value={overview.userCount} />
	</div>

	<Card title="Admin modules">
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<a
				class="border-2 border-[var(--color-border)] bg-white p-4 font-black no-underline hover:bg-[var(--color-primary)]"
				href={resolve('/admin/categories')}>Categories</a
			>
			<a
				class="border-2 border-[var(--color-border)] bg-white p-4 font-black no-underline hover:bg-[var(--color-primary)]"
				href={resolve('/admin/question-rules')}>Question Rules</a
			>
			<a
				class="border-2 border-[var(--color-border)] bg-white p-4 font-black no-underline hover:bg-[var(--color-primary)]"
				href={resolve('/admin/challenge-configs')}>Challenge Configs</a
			>
			<a
				class="border-2 border-[var(--color-border)] bg-white p-4 font-black no-underline hover:bg-[var(--color-primary)]"
				href={resolve('/admin/sessions')}>Session Monitoring</a
			>
		</div>
	</Card>
</section>
