"use client";

interface Metric {
	metricType: string;
	currentValue: number;
	percentageDiff: number;
}

interface MetricSelectorProps {
	metrics: Metric[];
	selectedMetric: string | null;
	onSelectMetric: (metricType: string) => void;
}

export default function MetricSelector({ metrics, selectedMetric, onSelectMetric }: MetricSelectorProps) {
	return (
		<div className="grid grid-cols-4 gap-4">
			{metrics.map((metric) => (
				<button
					key={metric.metricType}
					onClick={() => onSelectMetric(metric.metricType)}
					className={`p-4 border text-left ${
						selectedMetric === metric.metricType
							? "border-blue-500 bg-blue-50"
							: "border-gray-300 bg-white"
					}`}
				>
					<div className="text-xs text-gray-600 uppercase">
						{metric.metricType.replace(/_/g, " ")}
					</div>
					<div className="text-2xl font-bold mt-1 text-black">
						{metric.currentValue.toFixed(1)}
					</div>
					<div className={`text-xs mt-1 ${metric.percentageDiff > 0 ? "text-green-600" : "text-red-600"}`}>
						{metric.percentageDiff > 0 ? "↑" : "↓"} {Math.abs(metric.percentageDiff).toFixed(1)}%
					</div>
				</button>
			))}
		</div>
	);
}
