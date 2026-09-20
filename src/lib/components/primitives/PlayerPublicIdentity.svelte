<script lang="ts">
	type Props = {
		displayName: string;
		class?: string;
		nameClass?: string;
	};

	let { displayName, class: className = '', nameClass = '' }: Props = $props();
</script>

<span class={className}>
	<span class={nameClass}>{displayName}</span>
</span>
