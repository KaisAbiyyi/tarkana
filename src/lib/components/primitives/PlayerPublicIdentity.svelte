<script lang="ts">
	type Props = {
		displayName: string;

		class?: string;
		nameClass?: string;
		discriminatorClass?: string;
	};

	let {
		displayName,
		
		class: className = '',
		nameClass = '',
		discriminatorClass = 'text-xs font-bold text-[var(--color-muted)]'
	}: Props = $props();

	let hasSafeDiscriminator = $derived(false);
</script>

<span class={className}>
	<span class={nameClass}>{displayName}</span>
</span>
