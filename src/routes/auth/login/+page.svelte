<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import AuthShell from '$lib/components/auth/AuthShell.svelte';
	import AuthCard from '$lib/components/auth/AuthCard.svelte';
	import AuthField from '$lib/components/auth/AuthField.svelte';
	import PasswordField from '$lib/components/auth/PasswordField.svelte';
	import AuthDivider from '$lib/components/auth/AuthDivider.svelte';
	import AuthFeedback from '$lib/components/auth/AuthFeedback.svelte';
	import SocialAuthButton from '$lib/components/auth/SocialAuthButton.svelte';
	import Button from '$lib/components/primitives/Button.svelte';
	import { getI18nContext } from '$lib/i18n/context';

	type Props = {
		form?: ActionData;
	};

	let { form }: Props = $props();
	const { t } = getI18nContext();
	let f = $derived(form as any);
	let loading = $state(false);
	let googleLoading = $state(false);
</script>

<svelte:head>
	<title>{t('auth.loginTitle')}</title>
	<meta name="description" content={t('auth.loginMeta')} />
</svelte:head>

<AuthShell>
	<AuthCard title={t('auth.loginHeading')} description={t('auth.loginDescription')}>
		<form
			class="grid gap-5"
			method="POST"
			action="?/login"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					await update({ reset: false });
					loading = false;
				};
			}}
		>
			{#if form?.message && !form?.googleError}
				<AuthFeedback message={form.message} type="error" />
			{/if}

			<AuthField
				id="email"
				name="email"
				label={t('common.email')}
				type="email"
				value={f?.email ?? ''}
				error={f?.errors?.email}
				autocomplete="email"
				disabled={loading || googleLoading}
				required
			/>
			<PasswordField
				error={f?.errors?.password}
				autocomplete="current-password"
				disabled={loading || googleLoading}
				required
			/>
			<Button type="submit" {loading} disabled={googleLoading}>
				{loading ? t('auth.loggingIn') : t('nav.login')}
			</Button>
		</form>

		<AuthDivider />

		{#if form?.message && form?.googleError}
			<div class="mb-4">
				<AuthFeedback message={form.message} type="error" />
			</div>
		{/if}
		<SocialAuthButton disabled={loading} />

		<div class="mt-6 flex flex-col items-center gap-4 text-center">
			<p class="text-sm font-bold">
				{t('auth.noAccount')}
				<a
					href="/auth/register"
					class="text-[var(--color-accent-strong)] underline hover:text-[var(--color-ink)]"
					>{t('auth.createAccount')}</a
				>
			</p>
		</div>
	</AuthCard>
</AuthShell>
