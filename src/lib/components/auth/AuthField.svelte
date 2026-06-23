<script lang="ts">
	import Input from '$lib/components/primitives/Input.svelte';

	type Props = {
		id: string;
		name: string;
		label: string;
		value?: string;
		type?: 'text' | 'email';
		error?: string | null;
		autocomplete?: string;
		disabled?: boolean;
		required?: boolean;
	};

	let {
		id,
		name,
		label,
		value = $bindable(''),
		type = 'text',
		error = null,
		autocomplete,
		disabled = false,
		required = false
	}: Props = $props();
</script>

<Input {id} {name} {label} {type} bind:value {error} {autocomplete} {disabled} {required} />
