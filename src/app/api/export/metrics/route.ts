import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, getPermittedLocationIds, LocationAccessError } from '@/lib/auth';

export async function GET(req: Request) {
	try {
		const user = await getCurrentUser();
		const { searchParams } = new URL(req.url);
		const locationIds = searchParams.getAll('locationId');
		const metricType = searchParams.get('metricType');
		const startDate = searchParams.get('startDate');
		const endDate = searchParams.get('endDate');

		let permitted: string[] | null = null;
		try {
			permitted = getPermittedLocationIds(user, locationIds);
		} catch (err) {
			if (err instanceof LocationAccessError) {
				return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
			}
			throw err;
		}

		const where: any = { orgId: user.orgId };

		if (permitted) {
			where.locationId = { in: permitted };
		}
		if (metricType) where.metricType = metricType;
		if (startDate) {
			where.date = { ...where.date, gte: new Date(startDate) };
		}
		if (endDate) {
			where.date = { ...where.date, lte: new Date(endDate) };
		}

		// Filters prepared

		const rollups = await prisma.dailyMetricRollup.findMany({
			where,
			include: {
				location: true,
			},
			orderBy: [{ locationId: 'asc' }, { metricType: 'asc' }, { date: 'desc' }],
		});

		// Generate CSV
		const headers = [
			'Date',
			'Location',
			'Region',
			'Metric Type',
			'Value',
			'7-Day Avg',
			'Prior 7-Day Avg',
		];

		const rows = rollups.map((r) => [
			r.date.toISOString().split('T')[0],
			r.location.name,
			r.location.region,
			r.metricType,
			r.value.toString(),
			r.avg7?.toString() || '',
			r.prior7Avg?.toString() || '',
		]);

		const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

		// CSV prepared

		return new NextResponse(csv, {
			headers: {
				'Content-Type': 'text/csv',
				'Content-Disposition': `attachment; filename="metrics-export-${new Date().toISOString().split('T')[0]}.csv"`,
			},
		});
	} catch (error) {
		console.error('Metrics export failed:', error);
		return NextResponse.json({ error: 'Failed to export metrics' }, { status: 500 });
	}
}
