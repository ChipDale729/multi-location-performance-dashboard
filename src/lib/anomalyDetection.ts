import { prisma } from '@/lib/db';

type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export async function generateAnomaliesForSeed(orgId: string): Promise<number> {
  const locations = await prisma.location.findMany({ where: { orgId }, select: { id: true } });
  if (locations.length === 0) return 0;

  const rollups = await prisma.dailyMetricRollup.findMany({ where: { orgId } });
  if (rollups.length === 0) return 0;

  const metrics = ['REVENUE', 'ORDERS', 'FOOTFALL', 'DOWNTIME_MINUTES', 'UNITS_PRODUCED', 'TICKETS_OPENED', 'TICKETS_CLOSED'];
  const rules = ['sudden_drop', 'spike', 'below_avg'];
  const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  let count = 0;
  for (let i = 0; i < 10; i++) {
    const loc = locations[Math.floor(Math.random() * locations.length)];
    const metric = metrics[Math.floor(Math.random() * metrics.length)];
    const rule = rules[Math.floor(Math.random() * rules.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const value = Math.random() * 1000;
    const threshold = Math.random() * 1000;

    await (prisma as any).anomaly.create({
      data: {
        orgId,
        locationId: loc.id,
        metricType: metric,
        rule,
        severity,
        value,
        threshold,
        detectedAt: new Date(),
      },
    });
    count++;
  }
  return count;
}

export async function generateActionItemsForSeed(orgId: string): Promise<number> {
  const anomalies = await (prisma as any).anomaly.findMany({
    where: { orgId, actionItemId: null },
    take: 10,
  });

  let count = 0;
  for (const anom of anomalies) {
    const actionItem = await prisma.actionItem.create({
      data: {
        orgId,
        locationId: anom.locationId,
        title: `${anom.metricType} anomaly at location`,
        description: `${anom.rule}: ${anom.value.toFixed(1)} vs ${anom.threshold.toFixed(1)}`,
        status: 'OPEN',
      },
    });

    await (prisma as any).anomaly.update({
      where: { id: anom.id },
      data: { actionItemId: actionItem.id },
    });
    count++;
  }
  return count;
}

// Compact rule definition: compute baseline once, apply generic drop/severity logic
const RULES = [
	{ key: 'sudden_drop_avg7', getBaseline: (r: any) => r.avg7 as number | null },
	{ key: 'sudden_drop_prior7', getBaseline: (r: any) => r.prior7Avg as number | null },
];

function severityFromPercentDrop(pct: number): Severity {
	if (pct > 5) return 'HIGH';
	if (pct > 2) return 'MEDIUM';
	return 'LOW';
}

export async function detectAnomalies(orgId: string) {
	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

	// Fetch valid locations for this org to prevent FK violations
	const locations = await prisma.location.findMany({
		where: { orgId },
		select: { id: true },
	});
	const locationSet = new Set(locations.map((l) => l.id));

	const latestRollups = await prisma.dailyMetricRollup.findMany({
		where: { orgId, date: { gte: sevenDaysAgo } },
		orderBy: { date: 'asc' },
	});

	if (latestRollups.length === 0) {
		return;
	}

  // Fetch all existing open anomalies upfront to avoid N+1 query problem
  const existingAnomalies = await (prisma as any).anomaly.findMany({
    where: {
      orgId,
      status: 'OPEN',
    },
    select: {
      locationId: true,
      metricType: true,
      rule: true,
    },
  });

  // Create a Set for fast lookup
  const existingKeys = new Set(
    existingAnomalies.map((a: any) => `${a.locationId}-${a.metricType}-${a.rule}`)
  );

	const anomaliesToCreate: Array<{ orgId: string; locationId: string; metricType: string; rule: string; severity: Severity; value: number; threshold: number; }> = [];

	for (const rollup of latestRollups) {
		if (!locationSet.has(rollup.locationId)) continue;

		for (const rule of RULES) {
			const baseline = rule.getBaseline(rollup);
			if (!baseline || baseline === 0) continue;
			const percentDrop = ((baseline - rollup.value) / baseline) * 100;
			if (percentDrop <= 40) continue;

			const sev = severityFromPercentDrop(percentDrop);
			const key = `${rollup.locationId}-${rollup.metricType}-${rule.key}`;
			if (!existingKeys.has(key)) {
				anomaliesToCreate.push({
					orgId,
					locationId: rollup.locationId,
					metricType: rollup.metricType as any,
					rule: rule.key,
					severity: sev,
					value: rollup.value,
					threshold: baseline,
				});
			}
		}
	}

	// Batch create anomalies
	if (anomaliesToCreate.length > 0) {
		await (prisma as any).anomaly.createMany({
			data: anomaliesToCreate,
		});
	}

	return { created: anomaliesToCreate.length };
}
