<script lang="ts">
	import type { Snippet } from 'svelte';
	import PublicShell from '$lib/components/app/PublicShell.svelte';
	import { getI18nContext } from '$lib/i18n/context';

	type Props = {
		children?: Snippet;
	};

	let { children }: Props = $props();
	const { t } = getI18nContext();
</script>

<PublicShell variant="auth">
	<section
		class="page-shell grid min-h-[calc(100vh-88px)] grid-cols-1 items-center gap-10 py-10 lg:grid-cols-2 lg:gap-16"
	>
		<div class="hidden text-left lg:block">
			<h2
				class="mb-8 text-[clamp(2rem,4vw,3rem)] leading-tight font-black tracking-tight text-balance"
			>
				{t('auth.pitch')}
			</h2>
			<ul class="grid gap-6 text-lg font-bold">
				<li class="flex items-center gap-4">
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center border-[3px] border-[var(--color-border)] bg-[var(--color-primary)] text-xl shadow-[var(--shadow-small)]"
					>
						✓
					</div>
					{t('auth.shortRounds')}
				</li>
				<li class="flex items-center gap-4">
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center border-[3px] border-[var(--color-border)] bg-[var(--color-accent)] text-xl shadow-[var(--shadow-small)]"
					>
						✓
					</div>
					{t('auth.savedResults')}
				</li>
				<li class="flex items-center gap-4">
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center border-[3px] border-[var(--color-border)] bg-[var(--color-lime)] text-xl shadow-[var(--shadow-small)]"
					>
						✓
					</div>
					{t('auth.performanceRating')}
				</li>
				<li class="flex items-center gap-4">
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center border-[3px] border-[var(--color-border)] bg-[var(--color-info)] text-xl shadow-[var(--shadow-small)]"
					>
						✓
					</div>
					{t('auth.reviewProgress')}
				</li>
			</ul>
		</div>
		<div class="flex w-full justify-center lg:justify-end">
			<div class="w-full max-w-[28rem]">
				{@render children?.()}
			</div>
		</div>
	</section>
</PublicShell>
