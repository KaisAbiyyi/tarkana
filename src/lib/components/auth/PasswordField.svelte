<script lang="ts">
	import Input from '$lib/components/primitives/Input.svelte';
	import { getI18nContext } from '$lib/i18n/context';

	type Props = {
		id?: string;
		name?: string;
		label?: string;
		value?: string;
		error?: string | null;
		autocomplete?: string;
		disabled?: boolean;
		required?: boolean;
	};

	const { t } = getI18nContext();
	let {
		id = 'password',
		name = 'password',
		label = t('common.password'),
		value = $bindable(''),
		error = null,
		autocomplete = 'current-password',
		disabled = false,
		required = false
	}: Props = $props();
</script>

<Input
	{id}
	{name}
	{label}
	type="password"
	bind:value
	{error}
	{autocomplete}
	{disabled}
	{required}
/>
