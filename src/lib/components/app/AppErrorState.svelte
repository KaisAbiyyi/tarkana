<script lang="ts">
	import Button from '$lib/components/primitives/Button.svelte';
	import Card from '$lib/components/primitives/Card.svelte';
	import { getI18nContext } from '$lib/i18n/context';

	type Props = {
		message: string;
		status: number;
	};

	let { message, status }: Props = $props();
	const { t } = getI18nContext();

	let title = $derived(
		status === 404
			? t('error.notFound')
			: status === 400
				? t('error.resultNotReady')
				: t('error.generic')
	);
</script>

<section class="mx-auto grid max-w-3xl gap-6">
	<Card tone={status >= 500 ? 'danger' : 'warning'} {title}>
		<div class="grid gap-5">
			<div class="grid gap-2">
				<p class="text-sm font-black uppercase">{t('error.status', { status })}</p>
				<p class="text-3xl font-black sm:text-4xl">{message}</p>
				<p class="font-semibold opacity-80">
					{t('error.resultHint')}
				</p>
			</div>

			<div class="flex flex-wrap gap-3">
				<Button href="/challenge">{t('error.continueChallenge')}</Button>
				<Button href="/history" variant="secondary">{t('error.openHistory')}</Button>
				<Button href="/dashboard" variant="ghost">{t('error.backDashboard')}</Button>
			</div>
		</div>
	</Card>
</section>
