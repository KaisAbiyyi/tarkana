<script lang="ts">
	type Props = {
		message: string;
		type?: 'error' | 'success';
	};

	let { message, type = 'error' }: Props = $props();
</script>

<div
	class={`border-2 border-[var(--color-border)] p-3 font-bold ${
		type === 'error' ? 'bg-[var(--color-danger)] text-white' : 'text-ink bg-[var(--color-success)]'
	}`}
	role={type === 'error' ? 'alert' : 'status'}
>
	{message}
</div>
