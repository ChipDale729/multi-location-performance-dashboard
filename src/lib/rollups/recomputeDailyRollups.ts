import { prisma } from '@/lib/db';
import { MetricType } from '@prisma/client';

const METRICS = Object.values(MetricType) as MetricType[];

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const utcDay = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const addDaysUTC = (d: Date, days: number) => new Date(d.getTime() + days * MS_PER_DAY);
const ymd = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD

type Key = string; // `${locationId}|${metricType}|${YYYY-MM-DD}`

export async function recomputeDailyRollups(params: {
  orgId: string;
  startDate: Date;
  endDate: Date;
}) {
  const orgId = params.orgId;

  const start = utcDay(params.startDate);
  const end = utcDay(params.endDate);

  const readStart = addDaysUTC(start, -13);
  const readEndExclusive = addDaysUTC(end, 1);

  const [locations, events] = await Promise.all([
    prisma.location.findMany({ where: { orgId }, select: { id: true } }),
    prisma.metricEvent.findMany({
      where: { orgId, timestamp: { gte: readStart, lt: readEndExclusive } },
      select: { locationId: true, metricType: true, timestamp: true, value: true },
      orderBy: { timestamp: 'asc' },
    }),
  ]);

  const locationIds = locations.map((l) => l.id);

  // (location, metric, day)
  const daily = new Map<Key, number>();
  for (const ev of events) {
    const day = utcDay(ev.timestamp);
    const key = `${ev.locationId}|${ev.metricType}|${ymd(day)}`;
    daily.set(key, (daily.get(key) ?? 0) + ev.value);
  }

  const upserts: Parameters<typeof prisma.dailyMetricRollup.upsert>[0][] = [];

  for (let day = new Date(start); day <= end; day = addDaysUTC(day, 1)) {
    const dayStr = ymd(day);

    for (const locationId of locationIds) {
      for (const metricType of METRICS) {
        const value = daily.get(`${locationId}|${metricType}|${dayStr}`) ?? 0;

        let sum7 = 0;
        for (let i = 0; i < 7; i++) {
          const d = addDaysUTC(day, -i);
          sum7 += daily.get(`${locationId}|${metricType}|${ymd(d)}`) ?? 0;
        }
        const avg7 = sum7 / 7;

        let sumPrior7 = 0;
        for (let i = 7; i < 14; i++) {
          const d = addDaysUTC(day, -i);
          sumPrior7 += daily.get(`${locationId}|${metricType}|${ymd(d)}`) ?? 0;
        }
        const prior7Avg = sumPrior7 / 7;

        upserts.push({
          where: {
            orgId_locationId_date_metricType: {
              orgId,
              locationId,
              date: day,
              metricType,
            },
          },
          update: { value, avg7, prior7Avg },
          create: { orgId, locationId, date: day, metricType, value, avg7, prior7Avg },
        });
      }
    }
  }

  const BATCH = 50;
  let upserted = 0;

  for (let i = 0; i < upserts.length; i += BATCH) {
    const batch = upserts.slice(i, i + BATCH);
    for (const u of batch) {
      await prisma.dailyMetricRollup.upsert(u);
      upserted += 1;
    }
  }

  return { upserted };
}
