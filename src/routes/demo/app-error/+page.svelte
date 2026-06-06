<script lang="ts">
	import AppErrorState from '$lib/components/app/AppErrorState.svelte';
</script>

<main class="page-shell mt-8">
	<AppErrorState
		status={400}
		message="Challenge cannot be finished before every question is answered"
	/>
</main>
