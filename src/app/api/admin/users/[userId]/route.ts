import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
export const runtime = 'nodejs';

async function validateLocationIds(orgId: string, locationIds: string[]) {
  if (!locationIds || locationIds.length === 0) return [];
  const uniqueIds = Array.from(new Set(locationIds));
  const count = await prisma.location.count({ where: { orgId, id: { in: uniqueIds } } });
  if (count !== uniqueIds.length) {
    throw new Error('One or more locations are invalid');
  }
  return uniqueIds;
}

function sanitizeUser(u: any) {
  return {
    id: u.id,
    orgId: u.orgId,
    email: u.email,
    name: u.name,
    role: u.role,
    locationIds: u.locationAccess?.map((l: any) => l.locationId) || [],
  };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const user = await getCurrentUser();
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId } = await params;
  const { name, role, password, locationIds } = await req.json();

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, orgId: true },
  });

  if (!target || target.orgId !== user.orgId) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (role && !['ADMIN', 'MANAGER', 'VIEWER'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  let sanitizedLocationIds: string[] | undefined = undefined;
  if (locationIds !== undefined) {
    try {
      sanitizedLocationIds = await validateLocationIds(user.orgId, locationIds || []);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Invalid locations' }, { status: 400 });
    }
  }

  const data: any = {};
  if (name) data.name = name;
  if (role) data.role = role;
  if (password) {
    data.password = await bcrypt.hash(password, 10);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      orgId: true,
      email: true,
      name: true,
      role: true,
      locationAccess: { select: { locationId: true } },
    },
  });

  if (sanitizedLocationIds !== undefined) {
    await prisma.locationAccess.deleteMany({ where: { userId: userId } });
    if (sanitizedLocationIds.length > 0) {
      await prisma.locationAccess.createMany({
        data: sanitizedLocationIds.map((locId) => ({ orgId: user.orgId, userId, locationId: locId })),
        skipDuplicates: true,
      });
    }
  }

  const refreshed = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      orgId: true,
      email: true,
      name: true,
      role: true,
      locationAccess: { select: { locationId: true } },
    },
  });

  return NextResponse.json({ user: sanitizeUser(refreshed) });
}
