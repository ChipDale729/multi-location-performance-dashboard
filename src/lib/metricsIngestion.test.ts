import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MetricSource } from '@prisma/client';
import type { MetricEventInput } from '@/lib/validation';
import { ingestMetricEvents } from './metricsIngestion';
import { prisma } from '@/lib/db';


const txMock = {
  metricEvent: { create: vi.fn() },
  rollupRecomputeQueue: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};


vi.mock('@/lib/db', () => {
  return {
    prisma: {
      metricEvent: { findMany: vi.fn() },
      $transaction: vi.fn(async (fn: any) => fn(txMock)),
    },
  };
});


const SOURCE: MetricSource = 'API' as MetricSource;

const ORG = 'org1';
const LOC = 'loc1';

const DAY_5 = '2025-01-05T12:00:00.000Z';
const DAY_10 = '2025-01-10T12:00:00.000Z';
const DAY_12 = '2025-01-12T05:00:00.000Z';
const DAY_20 = '2025-01-20T23:59:00.000Z';

type MetricTypeInput = MetricEventInput['metricType'];

function mkEvent(
  eventId: string,
  timestampIso: string,
  metricType: MetricTypeInput = 'revenue',
  value = 1
): MetricEventInput {
  return {
    eventId,
    orgId: ORG,
    locationId: LOC,
    timestamp: new Date(timestampIso),
    metricType,
    value,
  };
}

function mockExistingEventIds(ids: string[]) {
  vi.mocked(prisma.metricEvent.findMany).mockResolvedValue(
    ids.map((eventId) => ({ eventId })) as any
  );
}

describe('ingestMetricEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns zeros for empty input', async () => {
    const res = await ingestMetricEvents([], SOURCE);

    expect(res).toEqual({
      processed: 0,
      createdCount: 0,
      existingCount: 0,
      createdEventIds: [],
      existingEventIds: [],
    });

    expect(prisma.metricEvent.findMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does nothing when all events already exist', async () => {
    mockExistingEventIds(['e1', 'e2']);

    const res = await ingestMetricEvents(
      [mkEvent('e1', DAY_10), mkEvent('e2', DAY_12, 'orders', 2)],
      SOURCE
    );

    expect(res).toMatchObject({
      processed: 2,
      createdCount: 0,
      existingCount: 2,
      createdEventIds: [],
      existingEventIds: ['e1', 'e2'],
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(txMock.metricEvent.create).not.toHaveBeenCalled();
    expect(txMock.rollupRecomputeQueue.create).not.toHaveBeenCalled();
    expect(txMock.rollupRecomputeQueue.update).not.toHaveBeenCalled();
  });

  it('inserts new events and creates a queue row when none exists', async () => {
    mockExistingEventIds(['e1']);
    txMock.rollupRecomputeQueue.findUnique.mockResolvedValue(null);

    const res = await ingestMetricEvents(
      [mkEvent('e1', DAY_10), mkEvent('e2', DAY_12, 'orders', 2)],
      SOURCE
    );

    expect(res.createdEventIds).toEqual(['e2']);
    expect(res.existingEventIds).toEqual(['e1']);

    expect(txMock.metricEvent.create).toHaveBeenCalledTimes(1);
    expect(txMock.metricEvent.create.mock.calls[0][0].data).toMatchObject({
      eventId: 'e2',
      orgId: ORG,
      locationId: LOC,
      metricType: 'ORDERS',
      value: 2,
      source: SOURCE,
    });

    expect(txMock.rollupRecomputeQueue.create).toHaveBeenCalledTimes(1);
    const create = txMock.rollupRecomputeQueue.create.mock.calls[0][0].data;

    expect(create.orgId).toBe(ORG);
    expect(create.minDate.toISOString()).toBe('2025-01-12T00:00:00.000Z');
    expect(create.maxDate.toISOString()).toBe('2025-01-25T00:00:00.000Z');

    expect(txMock.rollupRecomputeQueue.update).not.toHaveBeenCalled();
  });

  it('merges date ranges into existing queue row', async () => {
    mockExistingEventIds([]);

    txMock.rollupRecomputeQueue.findUnique.mockResolvedValue({
      orgId: ORG,
      minDate: new Date('2025-01-10T00:00:00.000Z'),
      maxDate: new Date('2025-01-18T00:00:00.000Z'),
    });

    await ingestMetricEvents(
      [mkEvent('e3', DAY_5, 'revenue', 50), mkEvent('e4', DAY_20, 'orders', 3)],
      SOURCE
    );

    expect(txMock.rollupRecomputeQueue.update).toHaveBeenCalledTimes(1);
    const update = txMock.rollupRecomputeQueue.update.mock.calls[0][0];

    expect(update.where).toEqual({ orgId: ORG });
    expect(update.data.minDate.toISOString()).toBe('2025-01-05T00:00:00.000Z');
    expect(update.data.maxDate.toISOString()).toBe('2025-02-02T00:00:00.000Z');

    expect(txMock.metricEvent.create).toHaveBeenCalledTimes(2);
  });
});
