<script lang="ts">
	import { getI18nContext } from '$lib/i18n/context';
	type InputType = 'text' | 'email' | 'password' | 'number' | 'search';

	type Props = {
		id: string;
		name: string;
		label: string;
		value?: string | number;
		type?: InputType;
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
		error?: string | null;
		min?: number;
		max?: number;
		minlength?: number;
		maxlength?: number;
		autocomplete?: any;
		'aria-describedby'?: string;
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
		disabled = false,
		error = null,
		min,
		max,
		minlength,
		maxlength,
		autocomplete,
		'aria-describedby': ariaDescribedby,
		class: className = ''
	}: Props = $props();
	const { t } = getI18nContext();

	let isPasswordVisible = $state(false);
	let currentType = $derived(type === 'password' && isPasswordVisible ? 'text' : type);
</script>

<div class={`relative grid gap-2 ${className}`}>
	<label class="text-sm font-black uppercase" for={id}>{label}</label>
	<div class="relative">
		<input
			class="min-h-12 w-full border-[3px] border-[var(--color-border)] bg-white px-4 py-3 font-bold shadow-[var(--shadow-hard-sm)] disabled:opacity-50 {type ===
			'password'
				? 'pr-12'
				: ''}"
			{id}
			{name}
			type={currentType}
			bind:value
			{placeholder}
			{required}
			{disabled}
			{min}
			{max}
			{minlength}
			{maxlength}
			{autocomplete}
			aria-invalid={error ? 'true' : 'false'}
			aria-describedby={error ? `${id}-error` : ariaDescribedby}
		/>
		{#if type === 'password'}
			<button
				type="button"
				class="absolute top-1/2 right-3 -translate-y-1/2 p-2 text-[var(--color-muted)] hover:text-[var(--color-ink)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none"
				onclick={() => (isPasswordVisible = !isPasswordVisible)}
				aria-label={isPasswordVisible ? t('auth.hidePassword') : t('auth.showPassword')}
				aria-pressed={isPasswordVisible}
			>
				{#if isPasswordVisible}
					<svg
						class="h-5 w-5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path
							d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
						></path><line x1="1" y1="1" x2="23" y2="23"></line></svg
					>
				{:else}
					<svg
						class="h-5 w-5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle
							cx="12"
							cy="12"
							r="3"
						></circle></svg
					>
				{/if}
			</button>
		{/if}
	</div>
	{#if error}
		<p id={`${id}-error`} class="text-sm font-bold text-[var(--color-danger)]">{error}</p>
	{/if}
</div>
