import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
export const runtime = 'nodejs';

function sanitizeUsers(users: any[]) {
  return users.map((u) => ({
    id: u.id,
    orgId: u.orgId,
    email: u.email,
    name: u.name,
    role: u.role,
    locationIds: u.locationAccess?.map((l: any) => l.locationId) || [],
  }));
}

async function validateLocationIds(orgId: string, locationIds: string[]) {
  if (!locationIds || locationIds.length === 0) return [];
  const uniqueIds = Array.from(new Set(locationIds));
  const count = await prisma.location.count({ where: { orgId, id: { in: uniqueIds } } });
  if (count !== uniqueIds.length) {
    throw new Error('One or more locations are invalid');
  }
  return uniqueIds;
}

export async function GET() {
  const user = await getCurrentUser();
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { orgId: user.orgId },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      orgId: true,
      email: true,
      name: true,
      role: true,
      locationAccess: { select: { locationId: true } },
    },
  });

  return NextResponse.json({ users: sanitizeUsers(users) });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { email, name, password, role, locationIds } = await req.json();

  if (!email || !name || !password || !role) {
    return NextResponse.json({ error: 'email, name, password, and role are required' }, { status: 400 });
  }

  const allowedRoles = ['ADMIN', 'MANAGER', 'VIEWER'];
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  let sanitizedLocationIds: string[] = [];
  try {
    sanitizedLocationIds = await validateLocationIds(user.orgId, locationIds || []);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Invalid locations' }, { status: 400 });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const created = await prisma.user.create({
      data: {
        orgId: user.orgId,
        email,
        name,
        password: hashed,
        role,
        locationAccess: sanitizedLocationIds.length
          ? {
              createMany: {
                data: sanitizedLocationIds.map((locId) => ({ orgId: user.orgId, locationId: locId })),
                skipDuplicates: true,
              },
            }
          : undefined,
      },
      select: {
        id: true,
        orgId: true,
        email: true,
        name: true,
        role: true,
        locationAccess: { select: { locationId: true } },
      },
    });

    return NextResponse.json({ user: sanitizeUsers([created])[0] }, { status: 201 });
  } catch (error: any) {
    const message = error?.code === 'P2002' ? 'Email already exists' : 'Failed to create user';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
