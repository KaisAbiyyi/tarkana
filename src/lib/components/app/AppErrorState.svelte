<script lang="ts">
	import Button from '$lib/components/primitives/Button.svelte';
	import Card from '$lib/components/primitives/Card.svelte';

	type Props = {
		message: string;
		status: number;
	};

	let { message, status }: Props = $props();

	let title = $derived(
		status === 404
			? 'Page not found'
			: status === 400
				? 'Result is not ready'
				: 'Something went wrong'
	);
</script>

<section class="mx-auto grid max-w-3xl gap-6">
	<Card tone={status >= 500 ? 'danger' : 'warning'} {title}>
		<div class="grid gap-5">
			<div class="grid gap-2">
				<p class="text-sm font-black uppercase">Status {status}</p>
				<p class="text-3xl font-black sm:text-4xl">{message}</p>
				<p class="font-semibold opacity-80">
					Result review is available only after every challenge question has been answered and the
					session has been completed.
				</p>
			</div>

			<div class="flex flex-wrap gap-3">
				<Button href="/challenge">Continue challenge</Button>
				<Button href="/history" variant="secondary">Open history</Button>
				<Button href="/dashboard" variant="ghost">Back to dashboard</Button>
			</div>
		</div>
	</Card>
</section>
