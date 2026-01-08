import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recomputeDailyRollups } from './recomputeDailyRollups';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: {
    location: { findMany: vi.fn() },
    metricEvent: { findMany: vi.fn() },
    dailyMetricRollup: { upsert: vi.fn() },
    $transaction: vi.fn(async (fn: any) => fn(prisma)),
  },
}));

describe('recomputeDailyRollups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upserts rollups for each day and location', async () => {
    vi.mocked(prisma.location.findMany).mockResolvedValue([{ id: 'loc1' }] as any);
    vi.mocked(prisma.metricEvent.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.dailyMetricRollup.upsert).mockResolvedValue({} as any);

    await recomputeDailyRollups({
      orgId: 'test-org',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-03'),
    });

    expect(prisma.dailyMetricRollup.upsert).toHaveBeenCalled();
  });

  it('treats missing events as zero', async () => {
    vi.mocked(prisma.location.findMany).mockResolvedValue([{ id: 'loc1' }] as any);
    vi.mocked(prisma.metricEvent.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.dailyMetricRollup.upsert).mockResolvedValue({} as any);

    await recomputeDailyRollups({
      orgId: 'test-org',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-01'),
    });

    expect(prisma.dailyMetricRollup.upsert).toHaveBeenCalled();
  });

  it('sums multiple metric events on same day', async () => {
    vi.mocked(prisma.location.findMany).mockResolvedValue([{ id: 'loc1' }] as any);
    vi.mocked(prisma.metricEvent.findMany).mockResolvedValue([
      {
        locationId: 'loc1',
        metricType: 'ORDERS',
        timestamp: new Date('2025-01-02T08:00:00Z'),
        value: 2,
      },
      {
        locationId: 'loc1',
        metricType: 'ORDERS',
        timestamp: new Date('2025-01-02T18:00:00Z'),
        value: 3,
      },
    ] as any);
    vi.mocked(prisma.dailyMetricRollup.upsert).mockResolvedValue({} as any);

    await recomputeDailyRollups({
      orgId: 'test-org',
      startDate: new Date('2025-01-02'),
      endDate: new Date('2025-01-02'),
    });

    expect(prisma.dailyMetricRollup.upsert).toHaveBeenCalled();
  });
});
