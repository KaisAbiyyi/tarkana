<script lang="ts">
	import ProgressBar from '$lib/components/primitives/ProgressBar.svelte';

	type Props = {
		remainingSeconds: number;
		totalSeconds: number;
	};

	let { remainingSeconds, totalSeconds }: Props = $props();
	let isExpired = $derived(remainingSeconds <= 0);
	let isUrgent = $derived(!isExpired && remainingSeconds <= Math.max(5, totalSeconds * 0.25));
</script>

<div
	class={`border-[3px] border-[var(--color-border)] p-4 shadow-[var(--shadow-hard-sm)] ${
		isExpired
			? 'bg-[var(--color-danger)] text-white'
			: isUrgent
				? 'timer-urgent bg-[var(--color-primary)]'
				: 'bg-white'
	}`}
>
	<div class="flex items-center justify-between gap-4">
		<p class="font-black uppercase">Timer</p>
		<p class="text-2xl font-black">
			{Math.max(0, remainingSeconds)}s
		</p>
	</div>
	<div class="mt-3">
		<ProgressBar
			value={remainingSeconds}
			max={totalSeconds}
			label="Time remaining"
			tone={isExpired ? 'danger' : 'primary'}
		/>
	</div>
</div>
