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

export type MetricEventInput = z.infer<typeof metricEventSchema>;

export type MetricEventValidationError = {
  index: number;
  eventId?: string;
  message: string;
  issues?: z.core.$ZodIssue[];
};

export function validateMetricEventsBatch(
  raw: unknown,
  currentOrgId: string
): { validEvents: MetricEventInput[]; errors: MetricEventValidationError[] } {
  const errors: MetricEventValidationError[] = [];
  const validEvents: MetricEventInput[] = [];

  const arrayResult = z.array(z.unknown()).safeParse(raw);
  if (!arrayResult.success) {
    return {
      validEvents: [],
      errors: [
        {
          index: -1,
          message: 'Request body must be an array of metric events',
          issues: arrayResult.error.issues,
        },
      ],
    };
  }

  const rawEvents = arrayResult.data;

  rawEvents.forEach((rawEv, index) => {
    const parsed = metricEventSchema.safeParse(rawEv);

    if (!parsed.success) {
      errors.push({
        index,
        eventId: (rawEv as any)?.eventId,
        message: 'invalid event payload',
        issues: parsed.error.issues,
      });
      return;
    }

    const ev = parsed.data;

    if (ev.orgId !== currentOrgId) {
      errors.push({
        index,
        eventId: ev.eventId,
        message: `event's orgId=${ev.orgId} does not match user's orgId=${currentOrgId}`,
      });
      return;
    }

    validEvents.push(ev);
  });

  return { validEvents, errors };
}