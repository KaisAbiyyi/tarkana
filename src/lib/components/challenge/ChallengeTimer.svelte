<script lang="ts">
	import ProgressBar from '$lib/components/primitives/ProgressBar.svelte';

	type Props = {
		remainingSeconds: number;
		totalSeconds: number;
	};

	let { remainingSeconds, totalSeconds }: Props = $props();
	let isExpired = $derived(remainingSeconds <= 0);
</script>

<div class="border-[3px] border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-hard-sm)]">
	<div class="flex items-center justify-between gap-4">
		<p class="font-black uppercase">Timer</p>
		<p class={`text-2xl font-black ${isExpired ? 'text-[var(--color-danger)]' : ''}`}>
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
