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
import { useSession } from "next-auth/react";

export default function DashboardPage() {
	const [kpis, setKpis] = useState<KPI[]>([]);
	const [allLocations, setAllLocations] = useState<Array<[string, string]>>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
	const [showFilters, setShowFilters] = useState(false);
	const [filters, setFilters] = useState({
		locationIds: [] as string[],
		startDate: '',
		endDate: '',
	});
	const router = useRouter();
	const { data: session } = useSession();
	const user = session?.user as any;
	const isAdmin = user?.role === 'ADMIN';
	const isManager = user?.role === 'MANAGER' || isAdmin;
	const [recomputeLoading, setRecomputeLoading] = useState(false);
	const [recomputeOutput, setRecomputeOutput] = useState<string>("");

	// Fetch all locations once on mount
	useEffect(() => {
		const fetchAllLocations = async () => {
			try {
				const res = await fetch('/api/dashboard/locations');
				if (!res.ok) throw new Error("Failed to fetch locations");
				const data = await res.json();
				const locations = data.locations.map((loc: any) => [loc.id, loc.name]);
				setAllLocations(locations);
				// Set all locations as default filter
				setFilters(prev => ({
					...prev,
					locationIds: locations.map((loc: any) => loc[0])
				}));
			} catch (err) {
				// Swallow fetch error; UI will reflect via state
			}
		};
		fetchAllLocations();
	}, []);

	const fetchKPIs = async () => {
		try {
			const params = new URLSearchParams();
			filters.locationIds.forEach(id => params.append('locationId', id));
			if (filters.startDate) params.append('startDate', filters.startDate);
			if (filters.endDate) params.append('endDate', filters.endDate);

			const url = `/api/dashboard/kpis${params.toString() ? '?' + params.toString() : ''}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error("Failed to fetch KPIs");
			const data = await res.json();
			setKpis(data.kpis);
			if (data.kpis.length > 0 && !selectedMetric) {
				setSelectedMetric(data.kpis[0].metricType);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchKPIs();
	}, [filters]);

	if (loading) return <div className="p-8">Loading dashboard...</div>;
	if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

	const handleExport = () => {
		const params = new URLSearchParams();
		filters.locationIds.forEach(id => params.append('locationId', id));
		if (selectedMetric) params.append('metricType', selectedMetric);
		if (filters.startDate) params.append('startDate', filters.startDate);
		if (filters.endDate) params.append('endDate', filters.endDate);
		
		const url = `/api/export/metrics${params.toString() ? '?' + params.toString() : ''}`;
		window.open(url, '_blank');
	};

	const selectedKPI = kpis.find((k) => k.metricType === selectedMetric);

	const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		if (e.target.value) router.push(`/dashboard/location/${e.target.value}`);
	};

	return (
		<div className="p-8 bg-slate-50 min-h-screen">
			<div className="max-w-7xl mx-auto space-y-8">
			<div className="flex items-end gap-4 justify-between">
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
				<div className="flex gap-2">
					<button
						onClick={() => setShowFilters(!showFilters)}
						className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 font-medium"
					>
						{showFilters ? 'Hide Filters' : 'Show Filters'}
					</button>
					<button
						onClick={handleExport}
						className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 font-medium"
					>
						Export to CSV
					</button>
					{isManager && (
						<button
							onClick={async () => {
								setRecomputeLoading(true);
								try {
									const res = await fetch('/api/rollups/process', { method: 'POST' });
									const json = await res.json();
									if (res.ok) {
										if (json.processed === 0) {
											setRecomputeOutput('No pending rollup jobs in queue.');
										} else {
											setRecomputeOutput(`Processed ${json.processed} job(s), upserted ${json.upserted ?? 0} rollups.`);
											// Refresh KPIs after recompute
											await fetchKPIs();
										}
									} else {
										setRecomputeOutput(`Error: ${json.error || 'Recompute failed'}`);
									}
								} catch (e: any) {
									setRecomputeOutput(`Error: ${String(e)}`);
								} finally {
									setRecomputeLoading(false);
								}
							}}
							disabled={recomputeLoading}
							className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 font-medium disabled:opacity-50"
						>
							{recomputeLoading ? 'Recomputing…' : 'Recompute Rollups'}
						</button>
					)}
				</div>
			</div>

			{recomputeOutput && (
				<div className="max-w-7xl mx-auto px-8 py-2 text-sm text-slate-700">
					{recomputeOutput}
					<button onClick={() => setRecomputeOutput("")} className="ml-3 text-slate-600 hover:text-slate-900">Clear</button>
				</div>
			)}

			{/* Filters */}
			{showFilters && (
				<div className="bg-white border-2 border-blue-600 rounded-lg p-6 space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="font-bold text-lg">Dashboard Filters</h3>
						<button
							onClick={() => setShowFilters(false)}
							className="text-slate-500 hover:text-slate-700 text-xl"
						>
							✕
						</button>
					</div>
					
					<div className="grid grid-cols-3 gap-6">
						{/* Locations Filter */}
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-3">Locations</label>
							<div className="border border-slate-300 rounded p-3 bg-slate-50">
								{allLocations.length === 0 ? (
									<p className="text-sm text-slate-500">No locations available</p>
								) : (
									<div className="space-y-2 max-h-60 overflow-y-auto">
										{allLocations.map(([id, name]) => {
											const isChecked = filters.locationIds.includes(id);
											return (
												<div key={id} className="flex items-center">
													<input
														type="checkbox"
														id={`loc-${id}`}
														checked={isChecked}
														onChange={() => {
															const updated = isChecked
																? filters.locationIds.filter(lid => lid !== id)
																: [...filters.locationIds, id];
															setFilters({ ...filters, locationIds: updated });
														}}
														className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
													/>
													<label
														htmlFor={`loc-${id}`}
														className="ml-2 text-sm text-slate-700 cursor-pointer select-none"
													>
														{name}
													</label>
												</div>
											);
										})}
									</div>
								)}
							</div>
							<p className="text-xs text-slate-500 mt-2">
								{filters.locationIds.length} selected
							</p>
						</div>

						{/* Start Date Filter */}
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-3">Start Date</label>
							<input
								type="date"
								value={filters.startDate}
								onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
								className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900"
							/>
						</div>

						{/* End Date Filter */}
						<div>
							<label className="block text-sm font-medium text-slate-700 mb-3">End Date</label>
							<input
								type="date"
								value={filters.endDate}
								onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
								className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900"
							/>
						</div>
					</div>

					<div className="flex gap-2 justify-end pt-4 border-t border-slate-200">
						<button
							onClick={() => setFilters({ locationIds: [], startDate: '', endDate: '' })}
							className="px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 font-medium text-sm"
						>
							Clear All
						</button>
					</div>
				</div>
			)}

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
