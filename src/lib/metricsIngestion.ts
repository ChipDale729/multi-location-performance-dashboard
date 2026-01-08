import { prisma } from '@/lib/db';
import type { MetricType, MetricSource } from '@prisma/client';
import type { MetricEventInput } from '@/lib/validation';

export type IngestionResult = {
  processed: number;
  createdCount: number;
  existingCount: number;
  createdEventIds: string[];
  existingEventIds: string[];
};


export async function ingestMetricEvents(
  events: MetricEventInput[],
  source: MetricSource
): Promise<IngestionResult> {
  if (events.length === 0) {
    return {
      processed: 0,
      createdCount: 0,
      existingCount: 0,
      createdEventIds: [],
      existingEventIds: [],
    };
  }

  const eventIds = events.map((e) => e.eventId);

  // Find which eventIds already exist
  const existing = await prisma.metricEvent.findMany({
    where: {
      eventId: { in: eventIds },
    },
    select: { eventId: true },
  });

  const existingIdSet = new Set(existing.map((e) => e.eventId));

  const newEvents = events.filter((e) => !existingIdSet.has(e.eventId));
  const existingEvents = events.filter((e) => existingIdSet.has(e.eventId));

  const createdEventIds = newEvents.map((e) => e.eventId);
  const existingEventIds = existingEvents.map((e) => e.eventId);

  // Persist the new events
  if (newEvents.length > 0) {
    await prisma.$transaction(
      newEvents.map((ev) =>
        prisma.metricEvent.create({
          data: {
            eventId: ev.eventId,
            orgId: ev.orgId,
            locationId: ev.locationId,
            timestamp: new Date(ev.timestamp),
            metricType: ev.metricType.toUpperCase() as MetricType,
            value: ev.value,
            source,
          },
        })
      )
    );
  }

  return {
    processed: events.length,
    createdCount: createdEventIds.length,
    existingCount: existingEventIds.length,
    createdEventIds,
    existingEventIds,
  };
}
