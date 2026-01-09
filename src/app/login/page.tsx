"use client";

import { signIn } from 'next-auth/react';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else if (result?.ok) {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSeed() {
    setSeedMessage('');
    setSeedLoading(true);
    try {
      const resp = await fetch('/api/seed/run', { method: 'POST' });
      let data: any = {};
      try {
        data = await resp.json();
      } catch {}
      if (resp.ok && (data?.ok || data?.processed >= 0)) {
        setSeedMessage('Seeded demo data. You can log in now.');
      } else if (resp.status === 401) {
        setSeedMessage('Users already exist. Please log in.');
      } else if (data?.error) {
        setSeedMessage(`Seed failed: ${data.error}`);
      } else {
        setSeedMessage('Seed failed. Is the dev server running?');
      }
    } catch (e) {
      setSeedMessage('Seed failed. Is the dev server running?');
    } finally {
      setSeedLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Performance Dashboard</h1>
          <p className="text-slate-600">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black placeholder-slate-500"
              placeholder="admin@org.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black placeholder-slate-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 text-sm text-slate-600 bg-slate-50 p-4 rounded">
          <p className="font-medium mb-2">Demo credentials:</p>
          <p>Admin: admin@org.com / password</p>
          <p>Manager: manager@org.com / password</p>
          <p>Viewer: viewer@org.com / password</p>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={handleSeed}
            disabled={seedLoading}
            className="w-full bg-slate-200 text-slate-900 py-2 rounded-lg font-medium hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {seedLoading ? 'Seeding…' : 'Seed Demo Data'}
          </button>
          {seedMessage && (
            <p className="mt-2 text-sm text-slate-700">{seedMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
