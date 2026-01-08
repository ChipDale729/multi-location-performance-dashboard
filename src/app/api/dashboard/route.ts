import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
	try {
		const user = getCurrentUser();

		const rollups = await prisma.dailyMetricRollup.findMany({
			where: { orgId: user.orgId },
			orderBy: { date: 'desc' },
			take: 200,
		});

		return NextResponse.json({ ok: true, count: rollups.length, rollups });
	} catch (error) {
		console.error('Dashboard fetch failed:', error);
		return NextResponse.json({ error: 'Failed to fetch rollups' }, { status: 500 });
	}
}

