export type SeedEvent = {
  eventId: string;
  orgId: string;
  locationId: string;
  timestamp: string;
  metricType: string;
  value: number;
};

function addDaysUTC(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function todayUtcMidnight(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    )
  );
}

function hashToNoise01(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  return (h % 1000) / 1000;
}

export function generateSeedEvents(params: {
  orgId: string;
  locationIds: string[];
  days: number;
}): SeedEvent[] {
  const { orgId, locationIds, days } = params;

  const end = todayUtcMidnight();

  const start = addDaysUTC(end, -(days - 1));

  const metrics = [
    { metricType: 'revenue', base: 1000, wiggle: 120, decimals: 2 },
    { metricType: 'orders', base: 40, wiggle: 12, decimals: 0 },
    { metricType: 'footfall', base: 120, wiggle: 40, decimals: 0 },
    { metricType: 'downtime_minutes', base: 5, wiggle: 8, decimals: 0 },
    { metricType: 'units_produced', base: 200, wiggle: 60, decimals: 0 },
    { metricType: 'tickets_opened', base: 15, wiggle: 10, decimals: 0 },
    { metricType: 'tickets_closed', base: 14, wiggle: 10, decimals: 0 },
  ] as const;

  const events: SeedEvent[] = [];

  for (const locationId of locationIds) {
    for (let i = 0; i < days; i++) {
      const dayDate = addDaysUTC(start, i);
      const dayStr = dayDate.toISOString().slice(0, 10);

      const timestamp = new Date(`${dayStr}T12:00:00.000Z`).toISOString();

      for (const m of metrics) {
        const key = `${orgId}|${locationId}|${m.metricType}|${dayStr}`;
        const noise = hashToNoise01(key) - 0.5;

        let value = m.base + noise * m.wiggle;

        if (m.decimals === 0) value = Math.round(value);
        else value = Math.round(value * 100) / 100;

        if (value < 0) value = 0;

        const eventId = `${orgId}|${locationId}|${m.metricType}|${dayStr}`;

        events.push({
          eventId,
          orgId,
          locationId,
          timestamp,
          metricType: m.metricType,
          value,
        });
      }
    }
  }

  return events;
}
