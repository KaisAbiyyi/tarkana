<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/primitives/Button.svelte';

	type Props = {
		children?: Snippet;
	};

	let { children }: Props = $props();
</script>

<div class="min-h-screen">
	<header class="page-shell flex items-center justify-between gap-4 py-5">
		<a class="text-2xl font-black no-underline" href={resolve('/')}>Tarkana</a>
		<nav class="flex items-center gap-3" aria-label="Public navigation">
			<a
				class="text-sm font-black uppercase underline decoration-[3px] underline-offset-4"
				href={resolve('/auth/login')}
			>
				Login
			</a>
			<Button href="/auth/register" size="sm">Mulai</Button>
		</nav>
	</header>

	<main>
		{@render children?.()}
	</main>
</div>
