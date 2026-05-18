<script lang="ts">
	type Props = {
		value: number;
		max?: number;
		label: string;
		tone?: 'primary' | 'accent' | 'success' | 'danger';
	};

	let { value, max = 100, label, tone = 'primary' }: Props = $props();

	const toneClass: Record<NonNullable<Props['tone']>, string> = {
		primary: 'bg-[var(--color-primary)]',
		accent: 'bg-[var(--color-accent)]',
		success: 'bg-[var(--color-success)]',
		danger: 'bg-[var(--color-danger)]'
	};

	let percent = $derived(max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100)));
</script>

<div class="grid gap-2" aria-label={label}>
	<div class="flex items-center justify-between gap-3 text-sm font-black">
		<span>{label}</span>
		<span>{Math.round(percent)}%</span>
	</div>
	<div
		class="h-5 border-[3px] border-[var(--color-border)] bg-white"
		role="progressbar"
		aria-valuemin="0"
		aria-valuemax={max}
		aria-valuenow={value}
	>
		<div class={`h-full ${toneClass[tone]}`} style={`width: ${percent}%`}></div>
	</div>
</div>
