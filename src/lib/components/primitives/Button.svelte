<script lang="ts">
	import type { Snippet } from 'svelte';

	type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'ink';
	type ButtonSize = 'sm' | 'md' | 'lg';

	type Props = {
		children?: Snippet;
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		variant?: ButtonVariant;
		size?: ButtonSize;
		disabled?: boolean;
		loading?: boolean;
		label?: string;
		class?: string;
		onclick?: () => void | Promise<void>;
	};

	let {
		children,
		href,
		type = 'button',
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		label,
		class: className = '',
		onclick
	}: Props = $props();

	const baseClass =
		'inline-flex touch-manipulation cursor-pointer items-center justify-center gap-2 border-[3px] border-[var(--color-border)] font-semibold uppercase tracking-wide no-underline transition-transform duration-150 hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:bg-[#d7d0c4]/60 disabled:text-[var(--color-muted)] disabled:shadow-none disabled:hover:translate-y-0 disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:opacity-80';
	const variantClass: Record<ButtonVariant, string> = {
		primary: 'bg-[var(--color-primary)] text-[var(--color-ink)] shadow-[var(--shadow-hard-sm)]',
		secondary: 'bg-[var(--color-accent)] text-[var(--color-ink)] shadow-[var(--shadow-hard-sm)]',
		danger: 'bg-[var(--color-danger)] text-white shadow-[var(--shadow-hard-sm)]',
		ghost: 'bg-white text-[var(--color-ink)] shadow-none',
		ink: 'button-ink'
	};
	const sizeClass: Record<ButtonSize, string> = {
		sm: 'min-h-11 px-3 py-2 text-xs',
		md: 'min-h-12 px-5 py-3 text-sm',
		lg: 'min-h-14 px-7 py-4 text-base'
	};

	let classes = $derived(`${baseClass} ${variantClass[variant]} ${sizeClass[size]} ${className}`);
</script>

{#if href}
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<a
		class={classes}
		href={disabled ? undefined : href}
		aria-disabled={disabled || loading}
		aria-label={label}
		aria-busy={loading}
	>
		{#if loading}<span class="button-spinner" aria-hidden="true"></span>{/if}
		{@render children?.()}
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
{:else}
	<button
		class={classes}
		{type}
		disabled={disabled || loading}
		aria-label={label}
		aria-busy={loading}
		{onclick}
	>
		{#if loading}<span class="button-spinner" aria-hidden="true"></span>{/if}
		{@render children?.()}
	</button>
{/if}

<style>
	.button-spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid currentColor;
		border-right-color: transparent;
		border-radius: 999px;
		animation: button-spin 650ms linear infinite;
	}

	@keyframes button-spin {
		to {
			transform: rotate(1turn);
		}
	}
</style>
