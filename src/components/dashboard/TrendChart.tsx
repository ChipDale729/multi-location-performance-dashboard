"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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

interface TrendChartProps {
	kpi: KPI;
}

export default function TrendChart({ kpi }: TrendChartProps) {
	const locationsWithTrend = kpi.locations.filter(
		(l) => l.avg7 !== null && l.prior7Avg !== null
	);

	if (locationsWithTrend.length === 0) {
		return (
			<div className="bg-white p-6 rounded-lg border border-slate-200">
				<p className="text-slate-500">No trend data available</p>
			</div>
		);
	}

	const chartData = locationsWithTrend.map((location) => ({
		name: location.locationName,
		"Current 7d": Number(location.avg7?.toFixed(2)),
		"Prior 7d": Number(location.prior7Avg?.toFixed(2)),
	}));

	return (
		<div className="bg-white p-6 border">
			<h3 className="font-bold mb-4">7-Day Comparison</h3>
			<ResponsiveContainer width="100%" height={300}>
				<BarChart data={chartData}>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
					<YAxis />
					<Tooltip formatter={(value) => typeof value === "number" ? value.toFixed(2) : value} contentStyle={{ color: '#000', backgroundColor: '#fff', border: '1px solid #ccc' }} />
					<Legend />
					<Bar dataKey="Current 7d" fill="#3b82f6" />
					<Bar dataKey="Prior 7d" fill="#93c5fd" />
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
