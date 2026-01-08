"use client";

interface KPI {
	metricType: string;
	total: number;
	average: number;
	trend: number | null;
	locations: Array<{
		locationId: string;
		locationName: string;
		value: number;
		avg7: number | null;
		prior7Avg: number | null;
	}>;
}

interface LocationRankingsProps {
	kpi: KPI;
}

export default function LocationRankings({ kpi }: LocationRankingsProps) {
	const sorted = [...kpi.locations].sort((a, b) => b.value - a.value);

	return (
		<div className="bg-white border">
			<div className="p-4 border-b">
				<h3 className="font-bold">Top Performers</h3>
			</div>
			<div>
				{sorted.slice(0, 5).map((location, index) => (
					<div key={location.locationId} className="p-4 border-b last:border-b-0">
						<div className="flex gap-3">
						<div className="w-6 text-sm font-bold text-black">{index + 1}.</div>
						<div className="flex-1">
							<div className="text-sm font-medium text-black">{location.locationName}</div>
								<div className="text-xs text-gray-500">{location.value.toFixed(1)}</div>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
