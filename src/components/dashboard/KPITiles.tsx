"use client";

interface KPI {
	metricType: string;
	total: number;
	average: number;
	trend: number | null;
	locations: Array<any>;
}

interface KPITilesProps {
	kpis: KPI[];
	selectedMetric: string | null;
	onSelectMetric: (metric: string) => void;
}

export default function KPITiles({
	kpis,
	selectedMetric,
	onSelectMetric,
}: KPITilesProps) {
	return (
		<div className="grid grid-cols-4 gap-4">
			{kpis.map((kpi) => {
				const isSelected = selectedMetric === kpi.metricType;

				return (
					<button
						key={kpi.metricType}
						onClick={() => onSelectMetric(kpi.metricType)}
						className={`p-6 border text-left ${
							isSelected ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white"
						}`}
					>
						<div className="text-sm text-gray-600 uppercase">
							{kpi.metricType.replace(/_/g, " ")}
						</div>
						<div className="text-3xl font-bold mt-2 text-black">{kpi.average.toFixed(1)}</div>
						<div className="text-xs text-gray-500 mt-1">{kpi.locations.length} locations</div>
						{kpi.trend !== null && (
							<div className={`text-sm mt-2 ${kpi.trend > 0 ? "text-green-600" : "text-red-600"}`}>
								{kpi.trend > 0 ? "↑" : "↓"} {Math.abs(kpi.trend).toFixed(1)}%
							</div>
						)}
					</button>
				);
			})}
		</div>
	);
}
