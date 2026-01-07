import { describe, it, expect } from 'vitest';
import { metricEventsBatchSchema } from './validation';

describe('metricEventsBatchSchema', () => {
  it('accepts a valid batch', () => {
    const input = [
      {
        eventId: '1',
        orgId: 'corg',
        locationId: 'loc-1',
        timestamp: '2025-01-01T12:00:00.000Z',
        metricType: 'REVENUE',
        value: 100,
      },
      {
        eventId: '2',
        orgId: 'org',
        locationId: 'loc-2',
        timestamp: '2025-01-01T12:00:00.000Z',
        metricType: 'ORDERS',
        value: 5,
      },
    ];

    const parsed = metricEventsBatchSchema.parse(input);
    expect(parsed).toHaveLength(2);
  });

  it('rejects if timestamp is invalid', () => {
    const badInput = [
      {
        eventId: '3',
        orgId: 'org',
        locationId: 'loc-1',
        timestamp: 'not-a-date',
        metricType: 'REVENUE',
        value: 100,
      },
    ];

    expect(() => metricEventsBatchSchema.parse(badInput)).toThrow();
  });

  it('rejects on invalid metric type', () => {
    const badInput = [
      {
        eventId: '3',
        orgId: 'org',
        locationId: 'loc-1',
        timestamp: '2025-01-01T12:00:00.000Z',
        metricType: 'INVALIDMETRIC',
        value: 100,
      },
    ];

    expect(() => metricEventsBatchSchema.parse(badInput)).toThrow();
  });
});


