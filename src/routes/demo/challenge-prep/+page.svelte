<script lang="ts">
	import AppShell from '$lib/components/app/AppShell.svelte';
	import ChallengePage from '../../(app)/challenge/+page.svelte';

	const profile = {
		id: 'visual-qa-player',
		displayName: 'Nara',
		publicDiscriminator: '1234',
		role: 'user' as const,
		rating: 105,
		rank: 'Bronze Mind' as const
	};
	const data = {
		locale: 'en' as const,
		profile,
		questionTypes: [
			'number_sequence',
			'symbol_pattern',
			'mini_deduction',
			'memory_pattern'
		] as const
	};
</script>

<AppShell {profile}>
	<ChallengePage {data} />
</AppShell>
