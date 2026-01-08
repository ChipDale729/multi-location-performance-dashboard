import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { MetricType } from '@prisma/client';
import { groupByMetric, getLatestByLocation, calculateTrend, computeAverage } from '@/lib/dashboardUtils';

type LocationValue = {
	value: number;
	avg7: number | null;
	prior7Avg: number | null;
	date: Date;
};

type KPIResponse = {
	metricType: MetricType;
	total: number;
	average: number;
	trend: number | null;
	locationCount: number;
	locations: Array<{
		locationId: string;
		locationName: string;
		value: number;
		avg7: number | null;
		prior7Avg: number | null;
	}>;
};

function getLatestLocationValue(rollups: any[], locationId: string): LocationValue | null {
	return getLatestByLocation(rollups, locationId) as LocationValue | null;
}

export async function GET() {
	try {
		const user = getCurrentUser();

		const locations = await prisma.location.findMany({
			where: { orgId: user.orgId },
		});

		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const rollups = await prisma.dailyMetricRollup.findMany({
			where: { orgId: user.orgId, date: { gte: thirtyDaysAgo } },
			orderBy: { date: 'desc' },
		});

		const byMetric = groupByMetric(rollups);
		const kpis: KPIResponse[] = [];

		byMetric.forEach((metricRollups, metricType) => {
			const locationData = new Map<string, LocationValue>();
			locations.forEach((loc) => {
				const data = getLatestLocationValue(metricRollups, loc.id);
				if (data) {
					locationData.set(loc.id, data);
				}
			});

			// Calculate aggregates
			const values = Array.from(locationData.values());
			const total = values.reduce((sum, v) => sum + v.value, 0);
			const average = values.length > 0 ? total / values.length : 0;

			// Calculate trend
			const avg7Values = values.filter((v) => v.avg7 !== null).map((v) => v.avg7!);
			const prior7Values = values.filter((v) => v.prior7Avg !== null).map((v) => v.prior7Avg!);
			const trend = calculateTrend(avg7Values, prior7Values);

			const locationsData = locations
				.map((loc) => {
					const data = locationData.get(loc.id);
					return {
						locationId: loc.id,
						locationName: loc.name,
						value: data?.value || 0,
						avg7: data?.avg7 || null,
						prior7Avg: data?.prior7Avg || null,
					};
				})
				.sort((a, b) => b.value - a.value);

			kpis.push({
				metricType,
				total,
				average,
				trend,
				locationCount: locationData.size,
				locations: locationsData,
			});
		});

		return NextResponse.json({ ok: true, orgId: user.orgId, kpis });
	} catch (error) {
		console.error('KPI fetch failed:', error);
		return NextResponse.json({ error: 'Failed to fetch KPIs' }, { status: 500 });
	}
}
