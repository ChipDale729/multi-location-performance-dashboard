import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recomputeDailyRollups } from './recomputeDailyRollups';
import { prisma } from '@/lib/db';
import { MetricType } from '@prisma/client';

// ---- prisma mock ----
const txMock = {
  dailyMetricRollup: { upsert: vi.fn() },
};

vi.mock('@/lib/db', () => ({
  prisma: {
    location: { findMany: vi.fn() },
    metricEvent: { findMany: vi.fn() },
    $transaction: vi.fn(async (fn: any) => fn(txMock)),
  },
}));

function isoDay(d: string) {
  // d = "YYYY-MM-DD"
  return new Date(`${d}T00:00:00.000Z`);
}

function asUpsertCalls() {
  return (txMock.dailyMetricRollup.upsert as any).mock.calls.map((c: any[]) => c[0]);
}

function findUpsert(where: {
  orgId: string;
  locationId: string;
  dateISO: string;
  metricType: MetricType;
}) {
  return asUpsertCalls().find((u: any) => {
    const w = u.where.orgId_locationId_date_metricType;
    return (
      w.orgId === where.orgId &&
      w.locationId === where.locationId &&
      new Date(w.date).toISOString() === where.dateISO &&
      w.metricType === where.metricType
    );
  });
}

describe('recomputeDailyRollups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upserts for every day x location x metric', async () => {
    vi.mocked(prisma.location.findMany).mockResolvedValue([{ id: 'loc1' }] as any);
    vi.mocked(prisma.metricEvent.findMany).mockResolvedValue([] as any);

    const start = isoDay('2025-01-01');
    const end = isoDay('2025-01-03'); // 3 days inclusive

    const res = await recomputeDailyRollups({ orgId: 'org1', startDate: start, endDate: end });

    const numDays = 3;
    const numLocs = 1;
    const numMetrics = Object.values(MetricType).length;

    expect(res.upserted).toBe(numDays * numLocs * numMetrics);
    expect(txMock.dailyMetricRollup.upsert).toHaveBeenCalledTimes(numDays * numLocs * numMetrics);
  });

  it('treats missing days as 0 for value and averages', async () => {
    vi.mocked(prisma.location.findMany).mockResolvedValue([{ id: 'loc1' }] as any);

    // Only one event on 2025-01-03 for REVENUE
    vi.mocked(prisma.metricEvent.findMany).mockResolvedValue([
      {
        locationId: 'loc1',
        metricType: 'REVENUE',
        timestamp: new Date('2025-01-03T12:00:00.000Z'),
        value: 70,
      },
    ] as any);

    await recomputeDailyRollups({
      orgId: 'org1',
      startDate: isoDay('2025-01-01'),
      endDate: isoDay('2025-01-03'),
    });

    const u = findUpsert({
      orgId: 'org1',
      locationId: 'loc1',
      dateISO: '2025-01-03T00:00:00.000Z',
      metricType: 'REVENUE',
    });

    expect(u).toBeTruthy();

    // value on 1/3 is 70, prior days in window are missing -> 0
    expect(u.update.value).toBe(70);
    expect(u.update.avg7).toBe(70 / 7);
    // prior7Avg uses days d-13..d-7, all missing => 0
    expect(u.update.prior7Avg).toBe(0);
  });

  it('sums multiple events on the same day into daily value', async () => {
    vi.mocked(prisma.location.findMany).mockResolvedValue([{ id: 'loc1' }] as any);

    vi.mocked(prisma.metricEvent.findMany).mockResolvedValue([
      {
        locationId: 'loc1',
        metricType: 'ORDERS',
        timestamp: new Date('2025-01-02T01:00:00.000Z'),
        value: 2,
      },
      {
        locationId: 'loc1',
        metricType: 'ORDERS',
        timestamp: new Date('2025-01-02T23:00:00.000Z'),
        value: 3,
      },
    ] as any);

    await recomputeDailyRollups({
      orgId: 'org1',
      startDate: isoDay('2025-01-02'),
      endDate: isoDay('2025-01-02'),
    });

    const u = findUpsert({
      orgId: 'org1',
      locationId: 'loc1',
      dateISO: '2025-01-02T00:00:00.000Z',
      metricType: 'ORDERS',
    });

    expect(u).toBeTruthy();
    expect(u.update.value).toBe(5);
    expect(u.update.avg7).toBe(5 / 7);
  });
});
