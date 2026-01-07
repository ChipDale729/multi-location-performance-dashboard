import { describe, it, expect, vi } from 'vitest';
import { POST } from './route';

// Mock auth helper
vi.mock('@/lib/auth', () => {
  return {
    getCurrentUser: () => ({
      id: 'user',
      orgId: 'org',
      role: 'ADMIN',
      email: 'demoadmin@org.com',
      name: 'Demo Admin',
    }),
  };
});

function makeRequest(body: unknown) {
  return {
    json: async () => body,
  } as any;
}

describe('POST /api/metrics/events', () => {
  it('accepts a valid batch', async () => {
    const body = [
      {
        eventId: '1',
        orgId: 'org',
        locationId: 'loc-1',
        timestamp: '2025-01-01T12:00:00.000Z',
        metricType: 'revenue',
        value: 1234.56,
      },
      {
        eventId: '2',
        orgId: 'org',
        locationId: 'loc-2',
        timestamp: '2025-01-01T13:00:00.000Z',
        metricType: 'orders',
        value: 42,
      },
    ];

    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.received).toBe(2);
  });

  it('returns 400 for invalid payload shape', async () => {
    // Single object instead of array
    const badBody = {
      eventId: '3',
      orgId: 'org',
      locationId: 'loc-1',
      timestamp: '2025-01-01T12:00:00.000Z',
      metricType: 'revenue',
      value: 100,
    };

    const res = await POST(makeRequest(badBody));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it('returns 400 when event fails validation', async () => {
    const badBody = [
      {
        eventId: '4',
        orgId: 'org',
        locationId: 'loc-1',
        timestamp: 'bad date',
        metricType: 'revenue',
        value: 100,
      },
    ];

    const res = await POST(makeRequest(badBody));
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it('returns 403 when any event has a mismatched orgId', async () => {
    const body = [
      {
        eventId: '5',
        orgId: 'org',
        locationId: 'loc-1',
        timestamp: '2025-01-01T12:00:00.000Z',
        metricType: 'revenue',
        value: 100,
      },
      {
        eventId: '6',
        orgId: 'org2',
        locationId: 'loc-2',
        timestamp: '2025-01-01T13:00:00.000Z',
        metricType: 'orders',
        value: 10,
      },
    ];

    const res = await POST(makeRequest(body));
    expect(res.status).toBe(403);

    const json = await res.json();
    expect(json.error).toContain('Org mismatch');
  });
});
