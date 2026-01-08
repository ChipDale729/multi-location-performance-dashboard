"use client";

import { useState, useEffect } from "react";
import KPITiles from "@/components/dashboard/KPITiles";
import TrendChart from "@/components/dashboard/TrendChart";
import LocationRankings from "@/components/dashboard/LocationRankings";
import LocationMatrix from "@/components/dashboard/LocationMatrix";

interface KPI {
	metricType: string;
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
}

import { useRouter } from "next/navigation";

export default function DashboardPage() {
	const [kpis, setKpis] = useState<KPI[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
	const router = useRouter();

	useEffect(() => {
		async function fetchKPIs() {
			try {
				const res = await fetch("/api/dashboard/kpis");
				if (!res.ok) throw new Error("Failed to fetch KPIs");
				const data = await res.json();
				setKpis(data.kpis);
				if (data.kpis.length > 0) {
					setSelectedMetric(data.kpis[0].metricType);
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : "Unknown error");
			} finally {
				setLoading(false);
			}
		}

		fetchKPIs();
	}, []);

	if (loading) return <div className="p-8">Loading dashboard...</div>;
	if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

	const selectedKPI = kpis.find((k) => k.metricType === selectedMetric);
	const allLocations = Array.from(
		new Map(kpis.flatMap((kpi) => kpi.locations.map((loc) => [loc.locationId, loc.locationName])))
	);

	const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		if (e.target.value) router.push(`/dashboard/location/${e.target.value}`);
	};

	return (
		<div className="p-8 bg-slate-50 min-h-screen">
			<div className="max-w-7xl mx-auto space-y-8">
				{/* Header */}
				<div>
					<h1 className="text-4xl font-bold text-slate-900">
						Performance Dashboard
					</h1>
					<p className="text-slate-600 mt-2">
						Organization overview with key performance indicators
					</p>
				</div>

			<div className="flex items-end gap-4">
				<div>
					<label className="block text-sm font-medium text-slate-700 mb-2">View Location Details</label>
					<select
						onChange={handleLocationChange}
						defaultValue=""
						className="px-4 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
					>
						<option value="">Select a location...</option>
						{allLocations.map(([id, name]) => (
							<option key={id} value={id}>{name}</option>
						))}
					</select>
				</div>
			</div>

			{/* KPI Tiles */}
			<div>
				<h2 className="text-xl font-bold mb-4">KPI Overview</h2>
				<KPITiles kpis={kpis} selectedMetric={selectedMetric} onSelectMetric={setSelectedMetric} />
			</div>

			{/* Trends and Rankings */}
			{selectedKPI && (
				<div className="grid grid-cols-3 gap-6">
					<div className="col-span-2">
						<h2 className="text-xl font-semibold text-slate-900 mb-4">
							Metric Type: {selectedKPI.metricType.charAt(0) + selectedKPI.metricType.slice(1).toLowerCase().replace(/_/g, ' ')}
						</h2>
						<TrendChart kpi={selectedKPI} />
					</div>
					<div>
						<h2 className="text-xl font-semibold text-slate-900 mb-4">Rankings</h2>
						<LocationRankings kpi={selectedKPI} />
					</div>
				</div>
			)}

			{/* Location x KPI Matrix */}
			<div>
				<h2 className="text-xl font-bold mb-4">Location Performance Matrix</h2>
				<LocationMatrix kpis={kpis} />
			</div>
		</div>
	</div>
	);
}
