import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const locations = await prisma.location.findMany({
    where: { orgId: user.orgId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, region: true },
  });

  return NextResponse.json({ locations });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id, name, region } = await req.json();

  if (!id || !name || !region) {
    return NextResponse.json({ error: 'id, name, and region are required' }, { status: 400 });
  }

  try {
    const location = await prisma.location.create({
      data: { id, name, region, orgId: user.orgId },
      select: { id: true, name: true, region: true },
    });

    return NextResponse.json({ location }, { status: 201 });
  } catch (error: any) {
    const message = error?.code === 'P2002' ? 'Location id already exists' : 'Failed to create location';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id, name, region } = await req.json();
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const existing = await prisma.location.findUnique({ where: { id } });
  if (!existing || existing.orgId !== user.orgId) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 });
  }

  const location = await prisma.location.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(region ? { region } : {}),
    },
    select: { id: true, name: true, region: true },
  });

  return NextResponse.json({ location });
}
