import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getPermittedLocationIds, LocationAccessError } from '@/lib/auth';
import {
  validateMetricEventsBatch,
  type MetricEventInput,
} from '@/lib/validation';
import { ingestMetricEvents } from '@/lib/metricsIngestion';
import { MetricSource } from '@prisma/client';

const SOURCE = MetricSource.API;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();

  // Only admins and managers can upload
  if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let permitted: string[] | null = null;
  try {
    permitted = getPermittedLocationIds(user);
  } catch (err) {
    if (err instanceof LocationAccessError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    throw err;
  }

  try {
    const json = await req.json();

    // Validate events to be posted
    const { validEvents, errors } = validateMetricEventsBatch(
      json,
      user.orgId
    );

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          errors,
        },
        { status: 400 }
      );
    }

    if (permitted) {
      const unauthorized = (validEvents as MetricEventInput[]).filter(
        (e) => !permitted!.includes(e.locationId)
      );
      if (unauthorized.length > 0) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            details: 'One or more events target locations outside your access scope.',
          },
          { status: 403 }
        );
      }
    }

    // Persist idempotently to db
    const result = await ingestMetricEvents(
      validEvents as MetricEventInput[],
      SOURCE
    );

    return NextResponse.json(
      {
        ok: true,
        message: 'Batch ingested',
        ...result,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        error: 'Invalid request or ingestion failure',
        details: e?.message ?? 'Unknown error',
      },
      { status: 400 }
    );
  }
}
