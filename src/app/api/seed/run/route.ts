import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { validateMetricEventsBatch } from '@/lib/validation';
import { ingestMetricEvents } from '@/lib/metricsIngestion';
import { MetricSource } from '@prisma/client';
import { generateSeedEvents } from '@/lib/seed/generateSeedEvents';

const DEFAULT_DAYS = 30;

const DEFAULT_LOCATIONS = [
  { id: 'loc-ny-1', name: 'NYC-1', region: 'EAST' },
  { id: 'loc-ny-2', name: 'NYC-2', region: 'EAST' },
  { id: 'loc-bos-1', name: 'BOS-1', region: 'EAST' },
  { id: 'loc-bos-2', name: 'BOS-2', region: 'EAST' },
  { id: 'loc-sf-1', name: 'SF-1', region: 'WEST' },
  { id: 'loc-sf-2', name: 'SF-2', region: 'WEST' },
  { id: 'loc-la-1', name: 'LA-1', region: 'WEST' },
  { id: 'loc-la-2', name: 'LA-2', region: 'WEST' },
];

async function ensureOrgAndLocations(orgId: string) {
  await prisma.organization.upsert({
    where: { id: orgId },
    update: { name: 'Demo Organization' },
    create: { id: orgId, name: 'Demo Organization' },
  });

  for (const l of DEFAULT_LOCATIONS) {
    await prisma.location.upsert({
      where: { id: l.id },
      update: { orgId, name: l.name, region: l.region },
      create: { id: l.id, orgId, name: l.name, region: l.region },
    });
  }

  const locs = await prisma.location.findMany({
    where: { orgId },
    select: { id: true },
    orderBy: { id: 'asc' },
  });

  return locs.map((x) => x.id);
}

export async function POST(req: NextRequest) {
  const user = getCurrentUser();

  if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const days = DEFAULT_DAYS

  const locationIds = await ensureOrgAndLocations(user.orgId);

  const rawEvents = generateSeedEvents({
    orgId: user.orgId,
    locationIds,
    days,
  });

  const { validEvents, errors } = validateMetricEventsBatch(rawEvents, user.orgId);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: 'Seed generator produced invalid events', errors },
      { status: 500 }
    );
  }

  const result = await ingestMetricEvents(validEvents as any, MetricSource.SEED);

  return NextResponse.json({
    ok: true,
    days,
    locations: locationIds.length,
    processed: result.processed,
    createdCount: result.createdCount,
    existingCount: result.existingCount,
  });
}
