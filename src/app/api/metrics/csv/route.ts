import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getPermittedLocationIds, LocationAccessError } from '@/lib/auth';
import { validateMetricEventsBatch, type MetricEventInput } from '@/lib/validation';
import { ingestMetricEvents } from '@/lib/metricsIngestion';
import { MetricSource } from '@prisma/client';

export const runtime = 'nodejs';

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }

  return rows;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();

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
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const text = await (file as File).text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No rows in CSV' }, { status: 400 });
    }

    // Transform CSV rows to metric events
    const events: MetricEventInput[] = rows
      .filter((row) => row.locationId && row.metricType && row.timestamp && row.value)
      .map((row) => ({
        eventId: `${row.locationId}|${row.metricType}|${row.timestamp}`,
        orgId: user.orgId,
        locationId: row.locationId,
        timestamp: new Date(row.timestamp).toISOString(),
        metricType: row.metricType.toUpperCase(),
        value: parseFloat(row.value),
      }));

    // Validate events
    const { validEvents, errors } = validateMetricEventsBatch(events, user.orgId);

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', errors, parsed: rows.length, valid: validEvents.length },
        { status: 400 }
      );
    }

    // Check location scope
    if (permitted) {
      const unauthorized = (validEvents as MetricEventInput[]).filter(
        (e) => !permitted!.includes(e.locationId)
      );
      if (unauthorized.length > 0) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            details: `${unauthorized.length} event(s) target locations outside your access scope.`,
          },
          { status: 403 }
        );
      }
    }

    // Ingest
    const result = await ingestMetricEvents(validEvents as MetricEventInput[], MetricSource.CSV);

    return NextResponse.json({
      ok: true,
      parsed: rows.length,
      valid: validEvents.length,
      invalid: rows.length - validEvents.length,
      processed: result.processed,
      createdCount: result.createdCount,
      existingCount: result.existingCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: 'CSV upload failed',
        details: err?.message ?? 'Unknown error',
      },
      { status: 400 }
    );
  }
}
