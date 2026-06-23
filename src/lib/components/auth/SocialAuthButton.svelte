<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/primitives/Button.svelte';
	import { getI18nContext } from '$lib/i18n/context';

	type Props = {
		disabled?: boolean;
	};

	let { disabled = false }: Props = $props();
	const { t } = getI18nContext();
	let loading = $state(false);
</script>

<form
	method="POST"
	action="?/google"
	use:enhance={() => {
		loading = true;
		return async ({ update }) => {
			await update({ reset: false });
			loading = false;
		};
	}}
>
	<Button type="submit" variant="secondary" class="w-full" {loading} {disabled}>
		{t('auth.google')}
	</Button>
</form>
