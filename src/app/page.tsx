"use client";

import { useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string>("");

  async function post(path: string) {
    setLoading(true);
    try {
      const res = await fetch(path, { method: "POST" });
      const json = await res.json();
      setOutput(JSON.stringify(json, null, 2));
    } catch (e: any) {
      setOutput(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function get(path: string) {
    setLoading(true);
    try {
      const res = await fetch(path);
      const json = await res.json();
      setOutput(JSON.stringify(json, null, 2));
    } catch (e: any) {
      setOutput(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-8 text-sans dark:bg-black">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-2xl font-semibold">Dashboard</h1>

        <div className="mb-6 flex flex-col gap-2 sm:flex-row">
          <button
            className="rounded bg-blue-600 px-4 py-2 text-white"
            onClick={() => post('/api/seed/run')}
            disabled={loading}
          >
            Seed Data
          </button>

          <button
            className="rounded bg-green-600 px-4 py-2 text-white"
            onClick={() => post('/api/rollups/recompute')}
            disabled={loading}
          >
            Recompute Rollups
          </button>

          <button
            className="rounded bg-zinc-800 px-4 py-2 text-white"
            onClick={() => get('/api/dashboard')}
            disabled={loading}
          >
            Fetch Daily Rollups
          </button>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-medium">Output</h2>
          <pre className="max-h-[60vh] overflow-auto rounded bg-white p-4 text-sm">
            {loading ? 'Loading...' : output || 'No output yet.'}
          </pre>
        </div>
      </div>
    </div>
  );
}
