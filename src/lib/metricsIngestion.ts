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

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDaysUTC(d: Date, days: number): Date {
  return new Date(d.getTime() + days * MS_PER_DAY);
}

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
    where: { eventId: { in: eventIds } },
    select: { eventId: true },
  });

  const existingIdSet = new Set(existing.map((e) => e.eventId));

  const newEvents = events.filter((e) => !existingIdSet.has(e.eventId));
  const existingEvents = events.filter((e) => existingIdSet.has(e.eventId));


  const createdEventIds = newEvents.map((e) => e.eventId);
  const existingEventIds = existingEvents.map((e) => e.eventId);

  if (newEvents.length === 0) {
    return {
      processed: events.length,
      createdCount: 0,
      existingCount: existingEvents.length,
      createdEventIds,
      existingEventIds,
    };
  }

  // Assumption: a batch belongs to one org (validated upstream). If not, we still compute a window from the first org.
  const orgId = newEvents[0].orgId;

  // Compute rollup window to enqueue: [minDay .. maxDay+13]
  let minEventTime = new Date(newEvents[0].timestamp);
  let maxEventTime = new Date(newEvents[0].timestamp);

  for (let i = 1; i < newEvents.length; i++) {
    const t = new Date(newEvents[i].timestamp);
    if (t < minEventTime) minEventTime = t;
    if (t > maxEventTime) maxEventTime = t;
  }

  const minDate = utcDay(minEventTime);
  const maxDate = addDaysUTC(utcDay(maxEventTime), 13);

  // Use createMany (fast) instead of many create() calls (slow + tx timeout).
  // Chunk to avoid parameter limits on large batches.
  const CHUNK = 1000;

  await prisma.$transaction(
    async (tx) => {
      for (let i = 0; i < newEvents.length; i += CHUNK) {
        const slice = newEvents.slice(i, i + CHUNK);

        await tx.metricEvent.createMany({
          data: slice.map((ev) => ({
            eventId: ev.eventId,
            orgId: ev.orgId,
            locationId: ev.locationId,
            timestamp: new Date(ev.timestamp),
            metricType: ev.metricType.toUpperCase() as MetricType,
            value: ev.value,
            source,
          })),
          // If eventId is unique in your schema, this makes ingestion robust.
          // If you do NOT have a unique constraint on eventId, remove this line.
          skipDuplicates: true,
        });
      }

      const existingQueue = await tx.rollupRecomputeQueue.findUnique({
        where: { orgId },
      });

      if (!existingQueue) {
        await tx.rollupRecomputeQueue.create({
          data: { orgId, minDate, maxDate },
        });
      } else {
        await tx.rollupRecomputeQueue.update({
          where: { orgId },
          data: {
            minDate: existingQueue.minDate < minDate ? existingQueue.minDate : minDate,
            maxDate: existingQueue.maxDate > maxDate ? existingQueue.maxDate : maxDate,
          },
        });
      }
    },
    { timeout: 30000 } // extra safety; createMany should already be much faster
  );


  return {
    processed: events.length,
    createdCount: createdEventIds.length,
    existingCount: existingEventIds.length,
    createdEventIds,
    existingEventIds,
  };
}
