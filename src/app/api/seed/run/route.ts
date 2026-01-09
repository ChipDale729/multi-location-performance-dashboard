import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { validateMetricEventsBatch } from '@/lib/validation';
import { ingestMetricEvents } from '@/lib/metricsIngestion';
import { MetricSource } from '@prisma/client';
import { generateSeedEvents } from '@/lib/seed/generateSeedEvents';
import bcrypt from 'bcrypt';
export const runtime = 'nodejs';

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

const DEFAULT_USERS = [
  { id: 'user-admin', email: 'admin@org.com', name: 'Admin User', role: 'ADMIN' as const },
  { id: 'user-manager', email: 'manager@org.com', name: 'Manager User', role: 'MANAGER' as const },
  { id: 'user-viewer', email: 'viewer@org.com', name: 'Viewer User', role: 'VIEWER' as const },
];

async function ensureOrgAndLocations(orgId: string) {
  await prisma.organization.upsert({
    where: { id: orgId },
    update: { name: 'Demo Organization' },
    create: { id: orgId, name: 'Demo Organization' },
  });

  // Create users with hashed passwords
  const hashedPassword = await bcrypt.hash('password', 10);
  for (const u of DEFAULT_USERS) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: { name: u.name, role: u.role, password: hashedPassword },
      create: {
        id: u.id,
        orgId,
        email: u.email,
        name: u.name,
        role: u.role,
        password: hashedPassword,
      },
    });
  }

  for (const l of DEFAULT_LOCATIONS) {
    await prisma.location.upsert({
      where: { id: l.id },
      update: { orgId, name: l.name, region: l.region },
      create: { id: l.id, orgId, name: l.name, region: l.region },
    });
  }

  // Ensure location access rows exist for default users across all locations
  await prisma.locationAccess.deleteMany({
    where: { userId: { in: DEFAULT_USERS.map((u) => u.id) } },
  });

  const locs = await prisma.location.findMany({
    where: { orgId },
    select: { id: true },
    orderBy: { id: 'asc' },
  });

  const accessRows = DEFAULT_USERS.flatMap((u) =>
    locs.map((l) => ({
      orgId,
      userId: u.id,
      locationId: l.id,
    }))
  );

  if (accessRows.length > 0) {
    await prisma.locationAccess.createMany({ data: accessRows, skipDuplicates: true });
  }

  return locs.map((x) => x.id);
}

export async function POST(req: NextRequest) {
  // Allow seed without auth if no users exist (initial setup)
  let user;
  let orgId = 'org'; // Default org for initial seed
  
  try {
    user = await getCurrentUser();
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    orgId = user.orgId;
  } catch (error) {
    // Check if any users exist
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      // Users exist but auth failed - require login
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // No users exist - allow initial seed without auth
  }

  const body = await req.json().catch(() => ({}));
  const days = DEFAULT_DAYS

  const locationIds = await ensureOrgAndLocations(orgId);

  const rawEvents = generateSeedEvents({
    orgId,
    locationIds,
    days,
  });

  const { validEvents, errors } = validateMetricEventsBatch(rawEvents, orgId);
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
