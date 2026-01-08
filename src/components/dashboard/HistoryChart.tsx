"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface HistoryData {
	date: string;
	value: number;
	avg7: number | null;
	prior7Avg: number | null;
	orgAvg: number | null;
}

interface HistoryChartProps {
	data: HistoryData[];
	title?: string;
}

export default function HistoryChart({ data, title = "90-Day History" }: HistoryChartProps) {
	if (!data || data.length === 0) {
		return (
			<div className="bg-white p-6 border">
				<h3 className="text-lg font-bold mb-4">{title}</h3>
				<p className="text-gray-500">No history data available</p>
			</div>
		);
	}

	return (
		<div className="bg-white p-6 border">
			<h3 className="text-lg font-bold mb-4">{title}</h3>
			<ResponsiveContainer width="100%" height={400}>
				<LineChart data={data}>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis 
						dataKey="date" 
						tick={{ fontSize: 11 }}
						tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
					/>
					<YAxis />
					<Tooltip labelFormatter={(date) => new Date(date).toLocaleDateString()} />
					<Legend wrapperStyle={{ color: '#000' }} />
					<Line type="monotone" dataKey="value" stroke="#3b82f6" name="Daily" dot={false} />
					<Line type="monotone" dataKey="avg7" stroke="#10b981" name="7-Day" dot={false} />
					<Line type="monotone" dataKey="prior7Avg" stroke="#f59e0b" name="Prior 7-Day" dot={false} strokeDasharray="3 3" />
					<Line type="monotone" dataKey="orgAvg" stroke="#ef4444" name="Org Avg" dot={false} strokeDasharray="3 3" />
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}
