"use client";

interface KPI {
	metricType: string;
	locations: Array<{
		locationId: string;
		locationName: string;
		value: number;
	}>;
}

interface LocationMatrixProps {
	kpis: KPI[];
}

export default function LocationMatrix({ kpis }: LocationMatrixProps) {
	if (kpis.length === 0) {
		return <div className="text-slate-500">No data available</div>;
	}

	// Get all unique locations
	const locations = Array.from(
		new Map(
			kpis.flatMap((kpi) =>
				kpi.locations.map((loc) => [
					loc.locationId,
					loc.locationName,
				])
			)
		)
	);

	// Normalize values per metric for heatmap coloring
	const getColor = (value: number, metricValues: number[]) => {
		if (metricValues.length === 0) return "";
		const max = Math.max(...metricValues);
		const min = Math.min(...metricValues);
		const range = max - min || 1;
		const normalized = (value - min) / range;

		if (normalized < 0.33) return "bg-red-50";
		if (normalized < 0.66) return "bg-yellow-50";
		return "bg-green-50";
	};

	return (
		<div className="bg-white border-2 border-gray-300 rounded overflow-x-auto">
			<table className="w-full border-collapse">
				<thead>
				<tr className="border-b-2 border-gray-300">
					<th className="px-4 py-3 text-left text-xs font-bold bg-gray-100 w-48 text-black border-r border-gray-300">Location</th>
					{kpis.map((kpi) => (
						<th key={kpi.metricType} className="px-4 py-3 text-center text-xs font-bold bg-gray-100 text-black border-r border-gray-300 last:border-r-0">
							{kpi.metricType.replace(/_/g, " ")}
						</th>
					))}
				</tr>
				</thead>
				<tbody>
					{locations.map(([locationId, locationName]) => (
					<tr key={locationId} className="border-b-2 border-gray-300 hover:bg-gray-50">
						<td className="px-4 py-3 text-sm w-48 text-black border-r border-gray-300 font-medium">
							{locationName}
							</td>
							{kpis.map((kpi) => {
								const location = kpi.locations.find((l) => l.locationId === locationId);
								const metricValues = kpi.locations.map((l) => l.value);
								const bgColor = getColor(location?.value || 0, metricValues);

								return (
										<td key={`${locationId}-${kpi.metricType}`} className={`px-4 py-3 text-center text-sm text-black font-medium border-r border-gray-300 last:border-r-0 ${bgColor}`}>
										{location ? location.value.toFixed(1) : "—"}
									</td>
								);
							})}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
