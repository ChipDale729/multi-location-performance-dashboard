import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, getPermittedLocationIds, LocationAccessError, canAccessLocation } from '@/lib/auth';

export async function GET(req: Request) {
	try {
		const user = await getCurrentUser();
		const { searchParams } = new URL(req.url);
		const status = searchParams.get('status');
		const locationId = searchParams.get('locationId');

		let permitted: string[] | null = null;
		try {
			permitted = getPermittedLocationIds(user, locationId ? [locationId] : []);
		} catch (err) {
			if (err instanceof LocationAccessError) {
				return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
			}
			throw err;
		}

		const where: any = {
			orgId: user.orgId,
		};

		if (status) {
			where.status = status;
		}


		if (permitted) {
			where.locationId = { in: permitted };
		}

		const anomalies = await (prisma as any).anomaly.findMany({
			where,
			include: {
				location: { select: { name: true } },
			},
			orderBy: { detectedAt: 'desc' },
		});

		return NextResponse.json({
			ok: true,
			anomalies,
		});
	} catch (error) {
		return NextResponse.json({ error: 'Failed to fetch anomalies' }, { status: 500 });
	}
}

export async function PATCH(req: Request) {
	try {
		const user = await getCurrentUser();
		if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}
		const { id, status, actionItemId } = await req.json();

		const anomaly = await (prisma as any).anomaly.findUnique({ where: { id: parseInt(id) } });

		if (!anomaly || anomaly.orgId !== user.orgId) {
			return NextResponse.json({ error: 'Anomaly not found' }, { status: 404 });
		}

		if (!canAccessLocation(user, anomaly.locationId)) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const updated = await (prisma as any).anomaly.update({
			where: { id: parseInt(id) },
			data: {
				...(status && { status }),
				...(actionItemId && { actionItemId: parseInt(actionItemId) }),
			},
			include: { location: true, actionItem: true },
		});

		return NextResponse.json({ ok: true, anomaly: updated });
	} catch (error) {
		return NextResponse.json({ error: 'Failed to update anomaly' }, { status: 500 });
	}
}
