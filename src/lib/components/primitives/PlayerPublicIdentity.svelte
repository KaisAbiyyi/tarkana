<script lang="ts">
	type Props = {
		displayName: string;
		publicDiscriminator?: string | null;
		class?: string;
		nameClass?: string;
		discriminatorClass?: string;
	};

	let {
		displayName,
		publicDiscriminator,
		class: className = '',
		nameClass = '',
		discriminatorClass = 'text-xs font-bold text-[var(--color-muted)]'
	}: Props = $props();

	let hasSafeDiscriminator = $derived(
		publicDiscriminator && publicDiscriminator.trim() !== '' && publicDiscriminator !== '0000'
	);
</script>

<span class={className}>
	<span class={nameClass}>{displayName}</span>
	{#if hasSafeDiscriminator}
		<span class={discriminatorClass}>#{publicDiscriminator}</span>
	{/if}
</span>
