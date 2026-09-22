import type { AnalyticsEvent, NewAnalyticsEvent, NewIdentityAlias } from '$lib/server/db/schema';
import type {
	AnalyticsRepository,
	FunnelResult,
	FunnelStepMetric,
	RetentionResult
} from '$lib/server/db/repositories/analytics-repository';
import type { CanonicalEventName } from '$lib/shared/analytics/events';

export function createAnalyticsRepositoryFake(): AnalyticsRepository {
	const events: AnalyticsEvent[] = [];
	const aliases: NewIdentityAlias[] = [];

	return {
		async insertEvent(input: NewAnalyticsEvent): Promise<AnalyticsEvent> {
			const id = input.id ?? crypto.randomUUID();
			const existing = events.find((e) => e.id === id);
			if (existing) {
				return existing;
			}

			const newEvent: AnalyticsEvent = {
				id,
				distinctId: input.distinctId,
				userId: input.userId ?? null,
				event: input.event,
				properties: input.properties ?? {},
				createdAt: input.createdAt ?? new Date()
			};
			events.push(newEvent);
			return newEvent;
		},

		async createAlias(alias: NewIdentityAlias): Promise<void> {
			if (!aliases.some((a) => a.anonymousId === alias.anonymousId && a.userId === alias.userId)) {
				aliases.push(alias);
			}
		},

		async listEventsForDistinctId(distinctId: string): Promise<AnalyticsEvent[]> {
			return events
				.filter((e) => e.distinctId === distinctId)
				.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
		},

		async computeFunnel(
			stages: CanonicalEventName[],
			options: { startDate?: Date; endDate?: Date } = {}
		): Promise<FunnelResult> {
			if (stages.length === 0) {
				return { totalStarted: 0, steps: [], overallConversionRate: 0 };
			}

			const resolveActorId = (ev: AnalyticsEvent) => {
				const alias = aliases.find((a) => a.anonymousId === ev.distinctId);
				return alias?.userId ?? ev.userId ?? ev.distinctId;
			};

			const filtered = events.filter((e) => {
				if (options.startDate && e.createdAt < options.startDate) return false;
				if (options.endDate && e.createdAt > options.endDate) return false;
				return stages.includes(e.event as CanonicalEventName);
			});

			filtered.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

			const actorEvents = new Map<string, { event: string; createdAt: Date }[]>();
			for (const row of filtered) {
				const actorId = resolveActorId(row);
				const list = actorEvents.get(actorId) ?? [];
				list.push({ event: row.event, createdAt: row.createdAt });
				actorEvents.set(actorId, list);
			}

			const stepActors: Set<string>[] = stages.map(() => new Set<string>());

			for (const [actorId, timeline] of actorEvents.entries()) {
				let currentStageIdx = 0;
				let lastEventTime: Date | null = null;

				for (const ev of timeline) {
					if (ev.event === stages[currentStageIdx]) {
						if (lastEventTime === null || ev.createdAt >= lastEventTime) {
							stepActors[currentStageIdx].add(actorId);
							lastEventTime = ev.createdAt;
							currentStageIdx++;
							if (currentStageIdx >= stages.length) break;
						}
					}
				}
			}

			const totalStarted = stepActors[0]?.size ?? 0;
			const steps: FunnelStepMetric[] = [];

			for (let i = 0; i < stages.length; i++) {
				const count = stepActors[i].size;
				const conversionRate = totalStarted > 0 ? count / totalStarted : 0;
				const prevCount = i === 0 ? count : stepActors[i - 1].size;
				const dropOffRate = prevCount > 0 ? (prevCount - count) / prevCount : 0;

				steps.push({
					step: i + 1,
					event: stages[i],
					count,
					conversionRate: Math.round(conversionRate * 1000) / 1000,
					dropOffRate: Math.round(dropOffRate * 1000) / 1000
				});
			}

			const overallConversion =
				totalStarted > 0 && steps.length > 0 ? steps[steps.length - 1].count / totalStarted : 0;

			return {
				totalStarted,
				steps,
				overallConversionRate: Math.round(overallConversion * 1000) / 1000
			};
		},

		async computeRetention({
			cohortStartDate,
			cohortEndDate
		}: {
			cohortStartDate: Date;
			cohortEndDate: Date;
		}): Promise<RetentionResult> {
			const meaningfulEvents = ['challenge_started', 'challenge_completed'];
			const resolveActorId = (ev: AnalyticsEvent) => {
				const alias = aliases.find((a) => a.anonymousId === ev.distinctId);
				return alias?.userId ?? ev.userId ?? ev.distinctId;
			};

			const actorFirstSeen = new Map<string, Date>();
			const sorted = [...events]
				.filter((e) => meaningfulEvents.includes(e.event))
				.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

			for (const ev of sorted) {
				const actorId = resolveActorId(ev);
				if (!actorFirstSeen.has(actorId)) {
					actorFirstSeen.set(actorId, ev.createdAt);
				}
			}

			const cohortActors = new Map<string, Date>();
			for (const [actorId, firstSeen] of actorFirstSeen.entries()) {
				if (firstSeen >= cohortStartDate && firstSeen < cohortEndDate) {
					cohortActors.set(actorId, firstSeen);
				}
			}

			const cohortSize = cohortActors.size;
			if (cohortSize === 0) {
				return {
					cohortStartDate,
					cohortEndDate,
					cohortSize: 0,
					d1Count: 0,
					d1Rate: 0,
					d7Count: 0,
					d7Rate: 0
				};
			}

			const d1Actors = new Set<string>();
			const d7Actors = new Set<string>();

			for (const ev of events) {
				if (!meaningfulEvents.includes(ev.event)) continue;
				const actorId = resolveActorId(ev);
				const firstSeen = cohortActors.get(actorId);
				if (!firstSeen) continue;

				const diffHours = (ev.createdAt.getTime() - firstSeen.getTime()) / (1000 * 60 * 60);

				if (diffHours >= 24 && diffHours < 48) {
					d1Actors.add(actorId);
				}
				if (diffHours >= 168 && diffHours < 192) {
					d7Actors.add(actorId);
				}
			}

			const d1Count = d1Actors.size;
			const d7Count = d7Actors.size;

			return {
				cohortStartDate,
				cohortEndDate,
				cohortSize,
				d1Count,
				d1Rate: Math.round((d1Count / cohortSize) * 1000) / 1000,
				d7Count,
				d7Rate: Math.round((d7Count / cohortSize) * 1000) / 1000
			};
		}
	};
}
