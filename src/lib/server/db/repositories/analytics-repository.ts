import { and, asc, eq, gte, inArray, lt, lte, sql } from 'drizzle-orm';
import { getDb, type Database } from '$lib/server/db';
import {
	analyticsEvents,
	identityAliases,
	type AnalyticsEvent,
	type NewAnalyticsEvent,
	type NewIdentityAlias
} from '$lib/server/db/schema';
import type { CanonicalEventName } from '$lib/shared/analytics/events';
import { logger } from '$lib/server/observability/logger';

export interface FunnelStepMetric {
	step: number;
	event: CanonicalEventName;
	count: number;
	conversionRate: number; // Conversion rate relative to step 1 (0 to 1)
	dropOffRate: number; // Drop-off relative to previous step (0 to 1)
}

export interface FunnelResult {
	totalStarted: number;
	steps: FunnelStepMetric[];
	overallConversionRate: number;
}

export interface RetentionResult {
	cohortStartDate: Date;
	cohortEndDate: Date;
	cohortSize: number;
	d1Count: number;
	d1Rate: number;
	d7Count: number;
	d7Rate: number;
}

export interface AnalyticsRepository {
	insertEvent(event: NewAnalyticsEvent): Promise<AnalyticsEvent>;
	createAlias(alias: NewIdentityAlias): Promise<void>;
	listEventsForDistinctId(distinctId: string): Promise<AnalyticsEvent[]>;
	computeFunnel(
		stages: CanonicalEventName[],
		options?: { startDate?: Date; endDate?: Date }
	): Promise<FunnelResult>;
	computeRetention(options: {
		cohortStartDate: Date;
		cohortEndDate: Date;
	}): Promise<RetentionResult>;
}

export function createAnalyticsRepository(database: Database = getDb()): AnalyticsRepository {
	return {
		async insertEvent(event) {
			try {
				const [inserted] = await database
					.insert(analyticsEvents)
					.values(event)
					.onConflictDoNothing()
					.returning();

				if (!inserted) {
					// Idempotent hit: return existing event
					const [existing] = await database
						.select()
						.from(analyticsEvents)
						.where(eq(analyticsEvents.id, event.id!))
						.limit(1);
					return (
						existing ?? {
							id: event.id!,
							distinctId: event.distinctId,
							userId: event.userId ?? null,
							event: event.event,
							properties: event.properties ?? {},
							createdAt: event.createdAt ?? new Date()
						}
					);
				}
				return inserted;
			} catch (error) {
				logger.warn('Analytics event storage fallback due to DB error', {
					context: { action: 'analytics_db_fallback', error: (error as Error).message }
				});
				return {
					id: event.id!,
					distinctId: event.distinctId,
					userId: event.userId ?? null,
					event: event.event,
					properties: event.properties ?? {},
					createdAt: event.createdAt ?? new Date()
				};
			}
		},

		async createAlias(alias) {
			await database.insert(identityAliases).values(alias).onConflictDoNothing();
		},

		async listEventsForDistinctId(distinctId) {
			return database
				.select()
				.from(analyticsEvents)
				.where(eq(analyticsEvents.distinctId, distinctId))
				.orderBy(asc(analyticsEvents.createdAt));
		},

		async computeFunnel(stages, options = {}) {
			if (stages.length === 0) {
				return { totalStarted: 0, steps: [], overallConversionRate: 0 };
			}

			const conditions = [];
			if (options.startDate) {
				conditions.push(gte(analyticsEvents.createdAt, options.startDate));
			}
			if (options.endDate) {
				conditions.push(lte(analyticsEvents.createdAt, options.endDate));
			}
			conditions.push(inArray(analyticsEvents.event, stages));

			const events = await database
				.select({
					actorId: sql<string>`coalesce(${identityAliases.userId}::text, ${analyticsEvents.userId}::text, ${analyticsEvents.distinctId})`,
					event: analyticsEvents.event,
					createdAt: analyticsEvents.createdAt
				})
				.from(analyticsEvents)
				.leftJoin(identityAliases, eq(analyticsEvents.distinctId, identityAliases.anonymousId))
				.where(and(...conditions))
				.orderBy(asc(analyticsEvents.createdAt));

			// Build sequence-based funnel:
			// An actor progresses to step K if they have stage[K] with timestamp >= stage[K-1]
			const actorEvents = new Map<string, { event: string; createdAt: Date }[]>();
			for (const row of events) {
				const list = actorEvents.get(row.actorId) ?? [];
				list.push({ event: row.event, createdAt: row.createdAt });
				actorEvents.set(row.actorId, list);
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

		async computeRetention({ cohortStartDate, cohortEndDate }) {
			// Retention counts meaningful product activity only: challenge_started or challenge_completed
			const meaningfulRetentionEvents = ['challenge_started', 'challenge_completed'] as const;

			// 1. Identify cohort actors whose first meaningful activity occurred in [cohortStartDate, cohortEndDate)
			const actorFirstEvents = await database
				.select({
					actorId: sql<string>`coalesce(${identityAliases.userId}::text, ${analyticsEvents.userId}::text, ${analyticsEvents.distinctId})`,
					firstSeen: sql<Date>`min(${analyticsEvents.createdAt})`
				})
				.from(analyticsEvents)
				.leftJoin(identityAliases, eq(analyticsEvents.distinctId, identityAliases.anonymousId))
				.where(inArray(analyticsEvents.event, [...meaningfulRetentionEvents]))
				.groupBy(
					sql`coalesce(${identityAliases.userId}::text, ${analyticsEvents.userId}::text, ${analyticsEvents.distinctId})`
				);

			const cohortActors = new Map<string, Date>();
			for (const row of actorFirstEvents) {
				const firstSeen = new Date(row.firstSeen);
				if (firstSeen >= cohortStartDate && firstSeen < cohortEndDate) {
					cohortActors.set(row.actorId, firstSeen);
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

			// 2. Fetch subsequent meaningful events for cohort actors up to Day 8
			const maxCheckDate = new Date(cohortEndDate.getTime() + 8 * 24 * 60 * 60 * 1000);

			const subsequentEvents = await database
				.select({
					actorId: sql<string>`coalesce(${identityAliases.userId}::text, ${analyticsEvents.userId}::text, ${analyticsEvents.distinctId})`,
					createdAt: analyticsEvents.createdAt
				})
				.from(analyticsEvents)
				.leftJoin(identityAliases, eq(analyticsEvents.distinctId, identityAliases.anonymousId))
				.where(
					and(
						inArray(analyticsEvents.event, [...meaningfulRetentionEvents]),
						gte(analyticsEvents.createdAt, cohortStartDate),
						lt(analyticsEvents.createdAt, maxCheckDate)
					)
				);

			const d1Actors = new Set<string>();
			const d7Actors = new Set<string>();

			for (const row of subsequentEvents) {
				const firstSeen = cohortActors.get(row.actorId);
				if (!firstSeen) continue;

				const diffHours = (row.createdAt.getTime() - firstSeen.getTime()) / (1000 * 60 * 60);

				// Day 1 retention: activity between [24h, 48h) after first event
				if (diffHours >= 24 && diffHours < 48) {
					d1Actors.add(row.actorId);
				}

				// Day 7 retention: activity between [168h, 192h) after first event (7*24h = 168h)
				if (diffHours >= 168 && diffHours < 192) {
					d7Actors.add(row.actorId);
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
