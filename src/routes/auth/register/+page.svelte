<script lang="ts">
	import type { ActionData } from './$types';
	import PublicShell from '$lib/components/app/PublicShell.svelte';
	import Button from '$lib/components/primitives/Button.svelte';
	import Card from '$lib/components/primitives/Card.svelte';
	import Input from '$lib/components/primitives/Input.svelte';

	type Props = {
		form?: ActionData;
	};

	let { form }: Props = $props();
</script>

<PublicShell>
	<section class="page-shell grid min-h-[calc(100vh-88px)] place-items-center py-10">
		<Card
			class="w-full max-w-xl"
			title="Buat akun Tarkana"
			description="Mulai dari Unranked, naik lewat performa challenge."
		>
			<form class="grid gap-5" method="POST" action="?/register">
				{#if form?.message}
					<p class="border-2 border-[var(--color-border)] bg-[var(--color-info)] p-3 font-bold">
						{form.message}
					</p>
				{/if}

				<Input
					id="displayName"
					name="displayName"
					label="Display name"
					value={form?.displayName ?? ''}
					required
				/>
				<Input
					id="email"
					name="email"
					label="Email"
					type="email"
					value={form?.email ?? ''}
					required
				/>
				<Input id="password" name="password" label="Password" type="password" required />
				<Button type="submit">Daftar</Button>
			</form>

			<div class="my-5 border-t-[3px] border-[var(--color-border)]"></div>

			<form method="POST" action="?/google">
				<Button type="submit" variant="secondary" class="w-full">Daftar dengan Google</Button>
			</form>

			<p class="mt-5 text-sm font-bold text-[var(--color-muted)]">
				Logic Rating hanya berubah setelah kamu menyelesaikan challenge.
			</p>
		</Card>
	</section>
</PublicShell>
