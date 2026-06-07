<script lang="ts">
	import type { Snippet } from 'svelte';

	type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
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
		'inline-flex cursor-pointer items-center justify-center gap-2 border-[3px] border-[var(--color-border)] font-black uppercase no-underline transition-transform duration-150 hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:bg-[#d7d0c4] disabled:text-[var(--color-muted)] disabled:shadow-none';
	const variantClass: Record<ButtonVariant, string> = {
		primary: 'bg-[var(--color-primary)] text-[var(--color-ink)] shadow-[var(--shadow-hard-sm)]',
		secondary: 'bg-[var(--color-accent)] text-[var(--color-ink)] shadow-[var(--shadow-hard-sm)]',
		danger: 'bg-[var(--color-danger)] text-white shadow-[var(--shadow-hard-sm)]',
		ghost: 'bg-white text-[var(--color-ink)] shadow-none'
	};
	const sizeClass: Record<ButtonSize, string> = {
		sm: 'min-h-10 px-3 py-2 text-xs',
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
		{#if loading}<span aria-hidden="true">Loading</span>{/if}
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
		{#if loading}<span aria-hidden="true">Loading</span>{/if}
		{@render children?.()}
	</button>
{/if}
