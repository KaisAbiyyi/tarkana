<script lang="ts">
	import type { ActionData } from './$types';
	import { resolve } from '$app/paths';
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
			title="Masuk ke Tarkana"
			description="Lanjutkan challenge dan pantau Logic Rating kamu."
		>
			<form class="grid gap-5" method="POST" action="?/login">
				{#if form?.message}
					<p
						class="border-2 border-[var(--color-border)] bg-[var(--color-danger)] p-3 font-bold text-white"
					>
						{form.message}
					</p>
				{/if}

				<Input
					id="email"
					name="email"
					label="Email"
					type="email"
					value={form?.email ?? ''}
					required
				/>
				<Input id="password" name="password" label="Password" type="password" required />
				<Button type="submit">Masuk</Button>
			</form>

			<div class="my-5 border-t-[3px] border-[var(--color-border)]"></div>

			<form method="POST" action="?/google">
				<Button type="submit" variant="secondary" class="w-full">Masuk dengan Google</Button>
			</form>

			<p class="mt-5 text-sm font-bold text-[var(--color-muted)]">
				Belum punya akun?
				<a
					class="font-black underline decoration-[3px] underline-offset-4"
					href={resolve('/auth/register')}>Daftar</a
				>
			</p>
		</Card>
	</section>
</PublicShell>
