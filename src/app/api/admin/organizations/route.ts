import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const organization = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: { id: true, name: true },
  });

  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  return NextResponse.json({ organization });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name } = await req.json();
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const updated = await prisma.organization.update({
    where: { id: user.orgId },
    data: { name },
    select: { id: true, name: true },
  });

  return NextResponse.json({ organization: updated });
}
