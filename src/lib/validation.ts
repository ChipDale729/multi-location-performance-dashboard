import { z } from 'zod';

const metricTypeValues = [
  'revenue',
  'orders',
  'footfall',
  'downtime_minutes',
  'units_produced',
  'tickets_opened',
  'tickets_closed',
] as const;

export const metricTypeSchema = z
  .string()
  .transform(v => v.toLowerCase())
  .pipe(z.enum(metricTypeValues));
  
export const metricEventSchema = z.object({
  eventId: z.string(),
  orgId: z.string(),
  locationId: z.string(),
  timestamp: z.coerce.date(),
  metricType: metricTypeSchema,
  value: z.number(),
});

export const metricEventsBatchSchema = z.array(metricEventSchema);