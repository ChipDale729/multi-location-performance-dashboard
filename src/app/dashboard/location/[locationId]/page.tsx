"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import Link from "next/link";
import MetricSelector from "@/components/dashboard/MetricSelector";
import StatCard from "@/components/dashboard/StatCard";
import HistoryChart from "@/components/dashboard/HistoryChart";

interface Metric {
	metricType: string;
	currentValue: number;
	locationAverage: number;
	orgAverage: number;
	percentageDiff: number;
	avg7: number | null;
	prior7Avg: number | null;
	history: Array<{
		date: string;
		value: number;
		avg7: number | null;
		prior7Avg: number | null;
		orgAvg: number | null;
	}>;
}

interface LocationDetail {
	ok: boolean;
	location: { id: string; name: string; region: string; };
	metrics: Metric[];
}

export default function LocationDetailPage({
	params,
}: {
	params: Promise<{ locationId: string }>;
}) {
	const { locationId } = use(params);
	const [data, setData] = useState<LocationDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

	useEffect(() => {
		async function fetchLocation() {
			try {
				const res = await fetch(
					`/api/dashboard/location/${locationId}`
				);
				if (!res.ok) throw new Error("Failed to fetch location");
				const json = await res.json();
				setData(json);
				if (json.metrics.length > 0) {
					setSelectedMetric(json.metrics[0].metricType);
				}
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Unknown error"
				);
			} finally {
				setLoading(false);
			}
		}

		fetchLocation();
	}, [locationId]);

	if (loading) return <div className="p-8">Loading location details...</div>;
	if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
	if (!data)
		return <div className="p-8 text-red-600">No data found</div>;

	const selectedMetricData = data.metrics.find(
		(m) => m.metricType === selectedMetric
	);

	return (
		<div className="p-8 bg-slate-50 min-h-screen">
			<div className="max-w-6xl mx-auto space-y-8">
				{/* Header */}
				<div className="flex items-center gap-4">
					<Link
						href="/dashboard"
						className="text-blue-600 hover:text-blue-700 text-sm font-medium"
					>
						← Back to Dashboard
					</Link>
					<div>
						<h1 className="text-4xl font-bold text-slate-900">
							{data.location.name}
						</h1>
						<p className="text-slate-600 mt-1">
							{data.location.region}
						</p>
					</div>
				</div>

				{/* Metric Selector */}
				<div>
					<h2 className="text-lg font-semibold text-slate-900 mb-4">Select Metric</h2>
					<MetricSelector 
						metrics={data.metrics}
						selectedMetric={selectedMetric}
						onSelectMetric={setSelectedMetric}
					/>
				</div>

				{/* Metric Detail */}
				{selectedMetricData && (
					<div className="space-y-6">
						<div className="grid grid-cols-3 gap-4">
							<StatCard label="Current Value" value={selectedMetricData.currentValue} />
							<StatCard label="7-Day Average" value={selectedMetricData.locationAverage} />
							<StatCard 
								label="Org 7-Day Average" 
								value={selectedMetricData.orgAverage}
								subValue={`${selectedMetricData.percentageDiff > 0 ? "+" : ""}${selectedMetricData.percentageDiff.toFixed(1)}%`}
								valueColor={selectedMetricData.percentageDiff > 0 ? "text-green-600" : "text-red-600"}
							/>
						</div>
						<HistoryChart data={selectedMetricData.history} />
					</div>
				)}
			</div>
		</div>
	);
}