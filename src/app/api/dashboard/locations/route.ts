import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, getPermittedLocationIds } from '@/lib/auth';

export async function GET() {
	try {
		const user = await getCurrentUser();
		const permitted = getPermittedLocationIds(user) || undefined;

		const locations = await prisma.location.findMany({
			where: {
				orgId: user.orgId,
				...(permitted ? { id: { in: permitted } } : {}),
			},
			select: { id: true, name: true },
			orderBy: { name: 'asc' },
		});

		return NextResponse.json({ locations });
	} catch (error) {
		console.error('Failed to fetch locations:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch locations' },
			{ status: 500 }
		);
	}
}
