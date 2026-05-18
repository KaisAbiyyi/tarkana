<script lang="ts">
	type InputType = 'text' | 'email' | 'password' | 'number' | 'search';

	type Props = {
		id: string;
		name: string;
		label: string;
		value?: string | number;
		type?: InputType;
		placeholder?: string;
		required?: boolean;
		error?: string | null;
		min?: number;
		max?: number;
		class?: string;
	};

	let {
		id,
		name,
		label,
		value = $bindable(''),
		type = 'text',
		placeholder,
		required = false,
		error = null,
		min,
		max,
		class: className = ''
	}: Props = $props();
</script>

<div class={`grid gap-2 ${className}`}>
	<label class="text-sm font-black uppercase" for={id}>{label}</label>
	<input
		class="min-h-12 w-full border-[3px] border-[var(--color-border)] bg-white px-4 py-3 font-bold shadow-[var(--shadow-hard-sm)]"
		{id}
		{name}
		{type}
		bind:value
		{placeholder}
		{required}
		{min}
		{max}
		aria-invalid={error ? 'true' : 'false'}
		aria-describedby={error ? `${id}-error` : undefined}
	/>
	{#if error}
		<p id={`${id}-error`} class="text-sm font-bold text-[var(--color-danger)]">{error}</p>
	{/if}
</div>
