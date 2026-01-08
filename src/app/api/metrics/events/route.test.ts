import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { MetricSource } from '@prisma/client';

// ---- Mocks ----
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/metricsIngestion', () => ({
  ingestMetricEvents: vi.fn(),
}));

import { getCurrentUser } from '@/lib/auth';
import { ingestMetricEvents } from '@/lib/metricsIngestion';

// ---- Helpers ----
function makeRequest(body: unknown) {
  return {
    json: async () => body,
  } as any;
}

function makeEvent(overrides: Partial<any> = {}) {
  return {
    eventId: 'evt-1',
    orgId: 'org',
    locationId: 'loc-1',
    timestamp: '2025-01-01T12:00:00.000Z',
    metricType: 'revenue',
    value: 100,
    ...overrides,
  };
}

describe('POST /api/metrics/events', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(getCurrentUser).mockReturnValue({
      id: 'user',
      orgId: 'org',
      role: 'ADMIN',
      email: 'demoadmin@org.com',
      name: 'Demo Admin',
    } as any);

    vi.mocked(ingestMetricEvents).mockResolvedValue({
      processed: 2,
      createdCount: 2,
      existingCount: 0,
      createdEventIds: ['evt-1', 'evt-2'],
      existingEventIds: [],
    } as any);
  });

  it('403 if role is not ADMIN/MANAGER', async () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      id: 'user',
      orgId: 'org',
      role: 'VIEWER',
      email: 'viewer@org.com',
      name: 'Viewer',
    } as any);

    const res = await POST(makeRequest([makeEvent()]));
    expect(res.status).toBe(403);
    expect(ingestMetricEvents).not.toHaveBeenCalled();
  });

  it('400 if body is not an array', async () => {
    const res = await POST(makeRequest(makeEvent()));
    expect(res.status).toBe(400);
    expect(ingestMetricEvents).not.toHaveBeenCalled();
  });

  it('400 if any event is invalid', async () => {
    const res = await POST(makeRequest([makeEvent({ timestamp: 'bad date' })]));
    expect(res.status).toBe(400);
    expect(ingestMetricEvents).not.toHaveBeenCalled();
  });

  it('400 if tenant/orgId mismatches', async () => {
    const res = await POST(makeRequest([makeEvent({ orgId: 'other-org' })]));
    expect(res.status).toBe(400);
    expect(ingestMetricEvents).not.toHaveBeenCalled();
  });

  it('200 and calls ingestion for valid batch', async () => {
    const body = [
      makeEvent({ eventId: '1' }),
      makeEvent({ eventId: '2', metricType: 'orders', value: 42 }),
    ];

    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);

    expect(ingestMetricEvents).toHaveBeenCalledTimes(1);

    const [, sourceArg] = (ingestMetricEvents as any).mock.calls[0];
    expect(sourceArg).toBe(MetricSource.API);
  });
});
