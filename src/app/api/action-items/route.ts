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

		const where: any = { orgId: user.orgId };

		if (status) where.status = status;
		if (permitted) where.locationId = { in: permitted };

		const actionItems = await prisma.actionItem.findMany({
			where,
			include: {
				location: { select: { name: true } },
				assignee: { select: { name: true } },
			},
			orderBy: { timestamp: 'desc' },
		});

		return NextResponse.json({
			ok: true,
			actionItems,
		});
	} catch (error) {
		return NextResponse.json({ error: 'Failed to fetch action items' }, { status: 500 });
	}
}

export async function POST(req: Request) {
	try {
		const user = await getCurrentUser();
		if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const { locationId, title, description, metricType, anomalyId } = await req.json();

		if (!canAccessLocation(user, locationId)) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const location = await prisma.location.findUnique({ where: { id: locationId } });
		if (!location || location.orgId !== user.orgId) {
			return NextResponse.json({ error: 'Location not found' }, { status: 404 });
		}

		const actionItem = await prisma.actionItem.create({
			data: {
				orgId: user.orgId,
				locationId,
				title,
				description,
				metricType,
			} as any,
			include: {
				location: true,
				assignee: true,
			},
		});

		// Link to anomaly if provided
		if (anomalyId) {
			await (prisma as any).anomaly.update({
				where: { id: parseInt(anomalyId) },
				data: { actionItemId: actionItem.id },
			});
		}

		return NextResponse.json({ ok: true, actionItem });
	} catch (error) {
		return NextResponse.json({ error: 'Failed to create action item' }, { status: 500 });
	}
}

export async function PATCH(req: Request) {
	try {
		const user = await getCurrentUser();
		if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}
		const { id, status, assigneeUserId } = await req.json();

		const actionItem = await prisma.actionItem.findUnique({ where: { id: parseInt(id) } });

		if (!actionItem || actionItem.orgId !== user.orgId) {
			return NextResponse.json({ error: 'Action item not found' }, { status: 404 });
		}

		if (!canAccessLocation(user, actionItem.locationId)) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const updated = await prisma.actionItem.update({
			where: { id: parseInt(id) },
			data: {
				...(status && { status }),
				...(assigneeUserId && { assigneeUserId }),
			},
			include: {
				location: true,
				assignee: true,
			},
		});

		return NextResponse.json({ ok: true, actionItem: updated });
	} catch (error) {
		return NextResponse.json({ error: 'Failed to update action item' }, { status: 500 });
	}
}
