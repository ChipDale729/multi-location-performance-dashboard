"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardPage from "./dashboard/page";
import OpsQueuePage from "./ops-queue/page";
import AdminPage from "./admin/page";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ops-queue' | 'admin'>('dashboard');
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedOutput, setSeedOutput] = useState<string>("");
  const [recomputeLoading, setRecomputeLoading] = useState(false);
  const [recomputeOutput, setRecomputeOutput] = useState<string>("");
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvOutput, setCsvOutput] = useState<string>("");

  // Redirect to login if not authenticated
  if (status === 'loading') {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>;
  }

  if (status === 'unauthenticated') {
    // Redirect unauthenticated users to the login page
    router.replace('/login');
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Redirecting to login…</div>;
  }

  const user = session?.user as any;
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER' || isAdmin;

  async function runSeed() {
    setSeedLoading(true);
    try {
      const res = await fetch('/api/seed/run', { method: "POST" });
      const json = await res.json();
      
      if (json.ok) {
        const summary = `
Seed completed successfully!
        
Summary:
• Locations: ${json.locations}
• Days of data: ${json.days}
• Total events processed: ${json.processed}
• New rows created: ${json.createdCount}
• Existing rows: ${json.existingCount}`;
        setSeedOutput(summary);
      } else {
        setSeedOutput(`Error: ${json.error}\n\n${JSON.stringify(json.errors || [], null, 2)}`);
      }
    } catch (e: any) {
      setSeedOutput(`Error: ${String(e)}`);
    } finally {
      setSeedLoading(false);
    }
  }

  async function runRecompute() {
    setRecomputeLoading(true);
    try {
      const res = await fetch('/api/rollups/process', { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        if (json.processed === 0) {
          setRecomputeOutput('No pending rollup jobs in queue.');
        } else {
          setRecomputeOutput(`Processed ${json.processed} job(s), upserted ${json.upserted ?? 0} rollups.`);
        }
      } else {
        setRecomputeOutput(`Error: ${json.error || 'Recompute failed'}`);
      }
    } catch (e: any) {
      setRecomputeOutput(`Error: ${String(e)}`);
    } finally {
      setRecomputeLoading(false);
    }
  }

  async function handleCsvUpload(file: File) {
    setCsvLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/metrics/csv', { method: 'POST', body: formData });
      const json = await res.json();

      if (res.ok) {
        setCsvOutput(`
CSV Import Successful!

Summary:
• Parsed rows: ${json.parsed}
• Valid events: ${json.valid}
• Invalid rows: ${json.invalid}
• Processed: ${json.processed}
• Created: ${json.createdCount}
• Existing: ${json.existingCount}`);
      } else {
        setCsvOutput(`Error: ${json.error}\nDetails: ${json.details || json.errors?.join(', ')}`);
      }
    } catch (e: any) {
      setCsvOutput(`Error: ${String(e)}`);
    } finally {
      setCsvLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header with Navigation */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Performance Dashboard</h1>
            </div>
            {isManager && (
              <div className="flex gap-2">
                <button
                  onClick={runSeed}
                  disabled={seedLoading}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 font-medium disabled:opacity-50"
                >
                  {seedLoading ? 'Seeding...' : 'Seed Data'}
                </button>
                <button
                  onClick={runRecompute}
                  disabled={recomputeLoading}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 font-medium disabled:opacity-50"
                >
                  {recomputeLoading ? 'Recomputing...' : 'Recompute Rollups'}
                </button>
                <label className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 font-medium cursor-pointer">
                  <input
                    ref={(el) => {
                      if (el && csvOutput) {
                        el.value = '';
                      }
                    }}
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleCsvUpload(e.target.files[0]);
                        e.target.value = '';
                      }
                    }}
                    disabled={csvLoading}
                    className="hidden"
                  />
                  {csvLoading ? 'Uploading...' : 'Upload CSV'}
                </label>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('ops-queue')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'ops-queue'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Operations Queue
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'admin'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                Admin
              </button>
            )}
          </div>
        </div>

        {seedOutput && (
          <div className="max-w-7xl mx-auto px-8 py-2 text-sm text-slate-700">
            {seedOutput}
            <button onClick={() => setSeedOutput("")} className="ml-3 text-slate-600 hover:text-slate-900">Clear</button>
          </div>
        )}
        {recomputeOutput && (
          <div className="max-w-7xl mx-auto px-8 py-2 text-sm text-slate-700">
            {recomputeOutput}
            <button onClick={() => setRecomputeOutput("")} className="ml-3 text-slate-600 hover:text-slate-900">Clear</button>
          </div>
        )}
        {csvOutput && (
          <div className="max-w-7xl mx-auto px-8 py-2 text-sm text-slate-700">
            {csvOutput}
            <button onClick={() => setCsvOutput("")} className="ml-3 text-slate-600 hover:text-slate-900">Clear</button>
          </div>
        )}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'ops-queue' && <OpsQueuePage />}
        {activeTab === 'admin' && isAdmin && <AdminPage />}
      </div>
    </div>
  );
}
