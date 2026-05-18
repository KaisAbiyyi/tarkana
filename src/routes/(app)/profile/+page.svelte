<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import Button from '$lib/components/primitives/Button.svelte';
	import Card from '$lib/components/primitives/Card.svelte';
	import Input from '$lib/components/primitives/Input.svelte';

	type Props = {
		data: PageData;
		form?: ActionData;
	};

	let { data, form }: Props = $props();
	let profile = $derived(form?.profile ?? data.profile);
	let provider = $derived(data.user?.app_metadata?.provider ?? 'email');
</script>

<section class="grid gap-8">
	<header>
		<p class="font-black text-[var(--color-muted)] uppercase">Account settings</p>
		<h1 class="text-4xl font-black sm:text-5xl">Profile</h1>
	</header>

	<div class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
		<Card title="Public identity" description="Leaderboard memakai display name, bukan email.">
			<form class="grid gap-5" method="POST" action="?/updateDisplayName">
				{#if form?.message}
					<p class="border-2 border-[var(--color-border)] bg-[var(--color-info)] p-3 font-bold">
						{form.message}
					</p>
				{/if}
				<Input
					id="displayName"
					name="displayName"
					label="Display name"
					value={profile.displayName}
					required
				/>
				<Button type="submit">Update Display Name</Button>
			</form>
		</Card>

		<Card title="Account summary">
			<dl class="grid gap-4 sm:grid-cols-2">
				<div class="border-2 border-[var(--color-border)] bg-white p-4">
					<dt class="text-xs font-black text-[var(--color-muted)] uppercase">Rank</dt>
					<dd class="text-2xl font-black">{profile.rank}</dd>
				</div>
				<div class="border-2 border-[var(--color-border)] bg-white p-4">
					<dt class="text-xs font-black text-[var(--color-muted)] uppercase">Logic Rating</dt>
					<dd class="text-2xl font-black">{profile.rating}</dd>
				</div>
				<div class="border-2 border-[var(--color-border)] bg-white p-4">
					<dt class="text-xs font-black text-[var(--color-muted)] uppercase">Auth provider</dt>
					<dd class="text-2xl font-black">{provider}</dd>
				</div>
				<div class="border-2 border-[var(--color-border)] bg-white p-4">
					<dt class="text-xs font-black text-[var(--color-muted)] uppercase">Role</dt>
					<dd>
						<Badge tone={profile.role === 'admin' ? 'warning' : 'accent'}>{profile.role}</Badge>
					</dd>
				</div>
			</dl>
			<p class="mt-4 text-sm font-bold text-[var(--color-muted)]">
				Role, rating, rank, dan email tidak bisa diedit dari halaman profile.
			</p>
		</Card>
	</div>
</section>
