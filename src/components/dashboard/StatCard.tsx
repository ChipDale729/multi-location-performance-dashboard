"use client";

interface StatCardProps {
	label: string;
	value: number;
	subValue?: string;
	valueColor?: string;
}

export default function StatCard({ label, value, subValue, valueColor = "text-black" }: StatCardProps) {
	return (
		<div className="bg-white p-6 border">
			<div className="text-sm text-gray-600">{label}</div>
			<div className={`text-3xl font-bold mt-2 ${valueColor}`}>
				{value.toFixed(1)}
			</div>
			{subValue && <div className="text-sm mt-1">{subValue}</div>}
		</div>
	);
}
