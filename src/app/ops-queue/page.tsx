"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface Anomaly {
	id: number;
	locationId: string;
	location: { name: string };
	metricType: string;
	rule: string;
	severity: string;
	value: number;
	threshold: number;
	detectedAt: string;
	status: string;
	actionItemId: number | null;
}

interface ActionItem {
	id: number;
	locationId: string;
	location: { name: string };
	title: string;
	status: string;
	assigneeUserId: string | null;
	assignee: { name: string } | null;
	timestamp: string;
}

interface OrgUser {
	id: string;
	email: string;
	name: string;
	role: string;
}

const STATUSES = ["OPEN", "IN_PROGRESS", "CLOSED"] as const;
const STATUS_LABEL = (s: string) => (s === "IN_PROGRESS" ? "IN PROGRESS" : s);
const severityClass = (s: string) =>
	s === "CRITICAL"
		? "bg-red-200 text-red-900"
		: s === "HIGH"
		? "bg-orange-200 text-orange-900"
		: s === "MEDIUM"
		? "bg-yellow-200 text-yellow-900"
		: "bg-blue-200 text-blue-900";
const ANOMALY_HEADERS = ["Location", "Metric", "Rule", "Severity", "Value", "Status", "Action"];
const ACTION_HEADERS = ["Location", "Title", "Assigned To", "Created", "Status", "Assignee"];

export default function OpsQueuePage() {
	const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
	const [actionItems, setActionItems] = useState<ActionItem[]>([]);
	const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [anomalyFilter, setAnomalyFilter] = useState<string>("OPEN");
	const [actionItemFilter, setActionItemFilter] = useState<string>("OPEN");
	const { data: session } = useSession();
	const user = session?.user as any;
	const isViewer = user?.role === 'VIEWER';
	const isManager = user?.role === 'MANAGER' || user?.role === 'ADMIN';

	const fetchData = async () => {
		try {
			const [anomRes, itemRes, usersRes] = await Promise.all([
				fetch("/api/anomalies"),
				fetch("/api/action-items"),
				fetch("/api/admin/users"),
			]);

			if (!anomRes.ok || !itemRes.ok) throw new Error("Failed to fetch");

			const anomData = await anomRes.json();
			const itemData = await itemRes.json();
			const usersData = usersRes.ok ? await usersRes.json() : { users: [] };

			setAnomalies(anomData.anomalies);
			setActionItems(itemData.actionItems);
			setOrgUsers(usersData.users || []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, []);

	const handleStatusChange = async (id: number, newStatus: string, isAnomaly: boolean) => {
		if (isViewer) {
			alert('Viewers cannot modify statuses');
			return;
		}
		try {
			const endpoint = isAnomaly ? `/api/anomalies` : `/api/action-items`;
			const res = await fetch(endpoint, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id, status: newStatus }),
			});

			if (!res.ok) throw new Error("Update failed");

			// Refetch to get latest data
			await fetchData();
		} catch (err) {
			alert("Failed to update status");
		}
	};

	const handleAssigneeChange = async (itemId: number, assigneeUserId: string | null) => {
		if (!isManager) {
			alert('Only managers can assign items');
			return;
		}
		try {
			const res = await fetch("/api/action-items", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: itemId, assigneeUserId: assigneeUserId || null }),
			});

			if (!res.ok) throw new Error("Update failed");

			// Refetch to get latest data
			await fetchData();
		} catch (err) {
			alert("Failed to assign action item");
		}
	};

	const handleCreateActionItem = async (anomaly: Anomaly) => {
		if (isViewer) {
			alert('Viewers cannot create action items');
			return;
		}
		try {
			const res = await fetch("/api/action-items", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					locationId: anomaly.locationId,
					title: `${anomaly.severity} ${anomaly.metricType.replace(/_/g, " ")} anomaly`,
					description: `${anomaly.rule.replace(/_/g, " ")}: value ${anomaly.value.toFixed(1)} vs threshold ${anomaly.threshold.toFixed(1)}`,
					metricType: anomaly.metricType,
					anomalyId: anomaly.id,
				}),
			});

			if (!res.ok) throw new Error("Failed to create action item");

			// Refetch to get latest data
			await fetchData();
			alert("Action item created successfully");
		} catch (err) {
			alert("Failed to create action item");
		}
	};

	if (loading) return <div className="p-8">Loading ops queue...</div>;
	if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

	const filteredAnomalies = anomalyFilter === "ALL" 
		? anomalies 
		: anomalies.filter(a => a.status === anomalyFilter);

	const filteredActionItems = actionItemFilter === "ALL"
		? actionItems
		: actionItems.filter(ai => ai.status === actionItemFilter);

	return (
		<div className="p-8 bg-slate-50 min-h-screen">
			<div className="max-w-7xl mx-auto space-y-8">
				{/* Anomalies Section */}
				<div>
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-2xl font-bold">Anomalies ({filteredAnomalies.length})</h2>
						<select
							value={anomalyFilter}
							onChange={(e) => setAnomalyFilter(e.target.value)}
							className="px-3 py-2 border-2 border-gray-300 bg-white text-black rounded"
						>
							{[
								{ value: "ALL", label: "All" },
								{ value: "OPEN", label: "Open" },
								{ value: "IN_PROGRESS", label: "In Progress" },
								{ value: "CLOSED", label: "Closed" },
							].map((o) => (
								<option key={o.value} value={o.value}>{o.label}</option>
							))}
						</select>
					</div>
					<div className="bg-white border-2 border-gray-300 overflow-x-auto">
						<table className="w-full border-collapse">
							<thead>
								<tr className="border-b-2 border-gray-300">
									{ANOMALY_HEADERS.map((h) => (
										<th
											key={h}
											className={`px-4 py-3 ${h === "Status" || h === "Action" ? "text-center" : "text-left"} text-xs font-bold bg-gray-100 text-black`}
										>
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{filteredAnomalies.length === 0 ? (
									<tr>
										<td colSpan={7} className="px-4 py-4 text-center text-gray-500">
											No anomalies
										</td>
									</tr>
								) : (
									filteredAnomalies.map((anom) => (
										<tr key={anom.id} className="border-b-2 border-gray-300 hover:bg-gray-50">
											<td className="px-4 py-3 text-sm text-black border-r border-gray-300">
												{anom.location.name}
											</td>
											<td className="px-4 py-3 text-sm text-black border-r border-gray-300">
												{anom.metricType.replace(/_/g, " ")}
											</td>
											<td className="px-4 py-3 text-sm text-black border-r border-gray-300">
												{anom.rule.replace(/_/g, " ")}
											</td>
											<td className="px-4 py-3 text-sm font-bold border-r border-gray-300">
												<span className={`px-2 py-1 rounded text-xs ${severityClass(anom.severity)}`}>
													{anom.severity}
												</span>
											</td>
											<td className="px-4 py-3 text-sm text-black border-r border-gray-300">
												{anom.value.toFixed(1)} / {anom.threshold.toFixed(1)}
											</td>
												<td className="px-4 py-3 text-center border-r border-gray-300">
													{isViewer ? (
														<span className="px-2 py-1 rounded text-xs bg-gray-100 text-slate-700">
															{STATUS_LABEL(anom.status)}
														</span>
													) : (
														<select
															value={anom.status}
															onChange={(e) => handleStatusChange(anom.id, e.target.value, true)}
															className="px-2 py-1 border border-gray-300 bg-white text-black text-xs rounded"
														>
															{STATUSES.map((s) => (
																<option key={s} value={s}>{STATUS_LABEL(s)}</option>
															))}
														</select>
													)}
												</td>
												<td className="px-4 py-3 text-center">
													{anom.actionItemId ? (
														<span className="text-xs text-green-700 font-semibold">✓ Created</span>
													) : isViewer ? (
														<span className="text-xs text-slate-500">View only</span>
													) : (
														<button
															onClick={() => handleCreateActionItem(anom)}
															className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
														>
															Create Item
														</button>
													)}
												</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>

				{/* Action Items Section */}
				<div>
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-2xl font-bold">Action Items ({filteredActionItems.length})</h2>
						<select
							value={actionItemFilter}
							onChange={(e) => setActionItemFilter(e.target.value)}
							className="px-3 py-2 border-2 border-gray-300 bg-white text-black rounded"
						>
							{[
								{ value: "ALL", label: "All" },
								{ value: "OPEN", label: "Open" },
								{ value: "IN_PROGRESS", label: "In Progress" },
								{ value: "CLOSED", label: "Closed" },
							].map((o) => (
								<option key={o.value} value={o.value}>{o.label}</option>
							))}
						</select>
					</div>
					<div className="bg-white border-2 border-gray-300 overflow-x-auto">
						<table className="w-full border-collapse">
							<thead>
								<tr className="border-b-2 border-gray-300">
									{ACTION_HEADERS.map((h) => (
										<th
											key={h}
											className={`px-4 py-3 ${(h === "Status" || h === "Assignee") ? "text-center" : "text-left"} text-xs font-bold bg-gray-100 text-black`}
										>
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{filteredActionItems.length === 0 ? (
									<tr>
										<td colSpan={6} className="px-4 py-4 text-center text-gray-500">
											No action items
										</td>
									</tr>
								) : (
									filteredActionItems.map((item) => (
										<tr key={item.id} className="border-b-2 border-gray-300 hover:bg-gray-50">
											<td className="px-4 py-3 text-sm text-black border-r border-gray-300">
												{item.location.name}
											</td>
											<td className="px-4 py-3 text-sm text-black border-r border-gray-300">
												{item.title}
											</td>
											<td className="px-4 py-3 text-sm text-black border-r border-gray-300">
												{item.assignee ? item.assignee.name : "-"}
											</td>
											<td className="px-4 py-3 text-sm text-black border-r border-gray-300">
												{new Date(item.timestamp).toLocaleDateString()}
											</td>
												<td className="px-4 py-3 text-center">
													{isViewer ? (
														<span className="px-2 py-1 rounded text-xs bg-gray-100 text-slate-700">
															{STATUS_LABEL(item.status)}
														</span>
													) : (
														<select
															value={item.status}
															onChange={(e) => handleStatusChange(item.id, e.target.value, false)}
															className="px-2 py-1 border border-gray-300 bg-white text-black text-xs rounded"
														>
															{STATUSES.map((s) => (
																<option key={s} value={s}>{STATUS_LABEL(s)}</option>
															))}
														</select>
													)}
												</td>
												<td className="px-4 py-3 text-center">
													{isViewer ? (
														<span className="text-xs text-slate-500">View only</span>
													) : isManager ? (
														<select
															value={item.assigneeUserId || ''}
															onChange={(e) => handleAssigneeChange(item.id, e.target.value || null)}
															className="px-2 py-1 border border-gray-300 bg-white text-black text-xs rounded"
														>
															<option value="">Unassigned</option>
															{orgUsers.map((u) => (
																<option key={u.id} value={u.id}>{u.name}</option>
															))}
														</select>
													) : (
														<span className="text-xs text-slate-500">-</span>
													)}
												</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	);
}
