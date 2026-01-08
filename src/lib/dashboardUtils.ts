import { MetricType } from "@prisma/client";

export function groupByMetric<T extends { metricType: MetricType }>(items: T[]) {
	const byMetric = new Map<MetricType, T[]>();
	items.forEach((item) => {
		if (!byMetric.has(item.metricType)) {
			byMetric.set(item.metricType, []);
		}
		byMetric.get(item.metricType)!.push(item);
	});
	return byMetric;
}

export function getLatestByLocation<T extends { locationId: string; date: Date }>(
	items: T[],
	locationId: string
): T | null {
	const filtered = items.filter((r) => r.locationId === locationId);
	return filtered.length > 0 
		? filtered.reduce((prev, curr) => (curr.date > prev.date ? curr : prev))
		: null;
}

export function calculateTrend(currentValues: number[], priorValues: number[]): number | null {
	if (currentValues.length === 0 || priorValues.length === 0) return null;
	const currentAvg = currentValues.reduce((a, b) => a + b, 0) / currentValues.length;
	const priorAvg = priorValues.reduce((a, b) => a + b, 0) / priorValues.length;
	return priorAvg !== 0 ? ((currentAvg - priorAvg) / priorAvg) * 100 : 0;
}

export function computeAverage(values: number[]): number {
	return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
}
