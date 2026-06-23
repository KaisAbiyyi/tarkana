<script lang="ts">
	import Badge from '$lib/components/primitives/Badge.svelte';
	import { formatSeconds, labelQuestionType } from '$lib/shared/presentation/format';
	import { getI18nContext } from '$lib/i18n/context';

	type ReviewItem = {
		sessionQuestionId: string;
		questionType: string;
		prompt: string;
		correctAnswer: string;
		explanation: string;
		selectedAnswer: string | null;
		isCorrect: boolean;
		timeSpentSeconds: number;
		scoreEarned: number;
		orderIndex: number;
	};

	type Props = {
		review: ReviewItem[];
	};

	let { review }: Props = $props();
	const { locale, t } = getI18nContext();
</script>

<div class="grid gap-4">
	{#each review as item (item.sessionQuestionId)}
		<article
			class="border-[3px] border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-hard-sm)]"
		>
			<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
				<div class="flex flex-wrap gap-2">
					<Badge tone={item.isCorrect ? 'success' : 'danger'}>
						{item.isCorrect ? t('result.correct') : t('result.wrong')}
					</Badge>
					<Badge tone="accent">{labelQuestionType(item.questionType, locale)}</Badge>
				</div>
				<p class="text-sm font-black">
					{t('arena.questionNumber', { number: item.orderIndex + 1 })}
				</p>
			</div>

			<h2 class="text-lg font-black">{item.prompt}</h2>
			<dl class="mt-4 grid gap-3 sm:grid-cols-3">
				<div>
					<dt class="text-xs font-black text-[var(--color-muted)] uppercase">
						{t('result.yourAnswer')}
					</dt>
					<dd class="font-bold">{item.selectedAnswer ?? t('result.noAnswer')}</dd>
				</div>
				<div>
					<dt class="text-xs font-black text-[var(--color-muted)] uppercase">
						{t('result.correctAnswer')}
					</dt>
					<dd class="font-bold">{item.correctAnswer}</dd>
				</div>
				<div>
					<dt class="text-xs font-black text-[var(--color-muted)] uppercase">
						{t('result.scoreTime')}
					</dt>
					<dd class="font-bold">
						{t('dashboard.points', { value: item.scoreEarned })}, {formatSeconds(
							item.timeSpentSeconds,
							locale
						)}
					</dd>
				</div>
			</dl>
			<p
				class="mt-4 border-l-[4px] border-[var(--color-border)] bg-[var(--color-paper)] p-3 font-semibold"
			>
				{item.explanation}
			</p>
		</article>
	{/each}
</div>
