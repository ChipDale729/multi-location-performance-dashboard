import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { groupByMetric, computeAverage } from '@/lib/dashboardUtils';

export async function GET(req: Request, { params }: { params: Promise<{ locationId: string }> }) {
	try {
		const user = getCurrentUser();
		const { locationId } = await params;

		const location = await prisma.location.findUnique({ where: { id: locationId } });

		if (!location || location.orgId !== user.orgId) {
			return NextResponse.json({ error: 'Location not found' }, { status: 404 });
		}

		const ninetyDaysAgo = new Date();
		ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

		const [rollups, orgRollups] = await Promise.all([
			prisma.dailyMetricRollup.findMany({
				where: { orgId: user.orgId, locationId, date: { gte: ninetyDaysAgo } },
				orderBy: { date: 'asc' },
			}),
			prisma.dailyMetricRollup.findMany({
				where: { orgId: user.orgId, date: { gte: ninetyDaysAgo } },
			}),
		]);

		const locationByMetric = groupByMetric(rollups);
		const orgByMetric = groupByMetric(orgRollups);

		const metrics = Array.from(locationByMetric.entries()).map(([metricType, locMetrics]) => {
			const orgMetrics = orgByMetric.get(metricType) || [];
			const locAvg = computeAverage(locMetrics.map((m) => m.value));
			const orgAvg = computeAverage(orgMetrics.map((m) => m.value));
			const percentageDiff = orgAvg !== 0 ? ((locAvg - orgAvg) / orgAvg) * 100 : 0;
			const latest = locMetrics[locMetrics.length - 1] || { value: 0, avg7: null, prior7Avg: null };

			const orgByDate = new Map<string, number[]>();
			orgMetrics.forEach((m) => {
				const dateKey = m.date.toISOString();
				const existing = orgByDate.get(dateKey) || [];
				existing.push(m.value);
				orgByDate.set(dateKey, existing);
			});

			return {
				metricType,
				currentValue: latest.value,
				locationAverage: locAvg,
				orgAverage: orgAvg,
				percentageDiff,
				avg7: latest.avg7,
				prior7Avg: latest.prior7Avg,
				history: locMetrics.map((m) => {
					const dateKey = m.date.toISOString();
					const orgValuesForDate = orgByDate.get(dateKey) || [];
					const orgAvgForDate = computeAverage(orgValuesForDate);
					return {
						date: m.date,
						value: m.value,
						avg7: m.avg7,
						prior7Avg: m.prior7Avg,
						orgAvg: orgAvgForDate || null,
					};
				}),
			};
		});

		return NextResponse.json({
			ok: true,
			location: { id: location.id, name: location.name, region: location.region },
			metrics,
		});
	} catch (error) {
		console.error('Location detail fetch failed:', error);
		return NextResponse.json({ error: 'Failed to fetch location details' }, { status: 500 });
	}
}
 