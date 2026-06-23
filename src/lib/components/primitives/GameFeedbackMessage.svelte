<script lang="ts">
	import { onDestroy } from 'svelte';
	import { gsap } from 'gsap';

	type Props = {
		message: string;
		tone?: 'info' | 'success' | 'error';
	};

	let { message, tone = 'info' }: Props = $props();
	let element = $state<HTMLParagraphElement | null>(null);

	$effect(() => {
		if (!element || !message || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
			return;
		gsap.killTweensOf(element);
		gsap.fromTo(
			element,
			{ x: tone === 'error' ? -5 : 0, y: 5, opacity: 0.5 },
			{
				x: 0,
				y: 0,
				opacity: 1,
				duration: 0.24,
				ease: 'power2.out',
				clearProps: 'transform,opacity'
			}
		);
	});

	onDestroy(() => gsap.killTweensOf(element));
</script>

<p
	bind:this={element}
	class="feedback"
	data-tone={tone}
	role={tone === 'error' ? 'alert' : 'status'}
>
	<span aria-hidden="true">{tone === 'error' ? '!' : tone === 'success' ? '✓' : 'i'}</span>
	{message}
</p>

<style>
	.feedback {
		display: flex;
		align-items: flex-start;
		gap: 0.55rem;
		margin: 0;
		border: 2px solid var(--color-border);
		background: white;
		padding: 0.65rem 0.75rem;
		font-size: 0.78rem;
		font-weight: 750;
		line-height: 1.35;
	}

	.feedback span {
		display: grid;
		width: 1.2rem;
		height: 1.2rem;
		flex: 0 0 auto;
		place-items: center;
		border: 2px solid var(--color-border);
		border-radius: 999px;
		font-size: 0.7rem;
		font-weight: 900;
	}

	.feedback[data-tone='success'] {
		background: var(--color-lime);
	}

	.feedback[data-tone='error'] {
		background: #ffe2de;
	}
</style>
