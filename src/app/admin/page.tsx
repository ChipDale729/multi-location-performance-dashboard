"use client";

import { useEffect, useMemo, useState } from "react";

const ROLE_OPTIONS = ["ADMIN", "MANAGER", "VIEWER"] as const;

type Organization = { id: string; name: string };
type Location = { id: string; name: string; region: string };
type User = { id: string; email: string; name: string; role: string; locationIds: string[] };

type ApiError = { error: string } | undefined;

async function api<T>(input: RequestInfo, init?: RequestInit): Promise<[T | undefined, ApiError]> {
  const res = await fetch(input, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const data = res.headers.get("content-type")?.includes("application/json") ? await res.json() : undefined;
  if (!res.ok) {
    return [undefined, data as ApiError];
  }
  return [data as T, undefined];
}

export default function AdminPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [orgName, setOrgName] = useState<string>("");

  const [locId, setLocId] = useState("");
  const [locName, setLocName] = useState("");
  const [locRegion, setLocRegion] = useState("");
  const [locUpdateId, setLocUpdateId] = useState<string>("");
  const [locUpdateName, setLocUpdateName] = useState<string>("");
  const [locUpdateRegion, setLocUpdateRegion] = useState<string>("");

  const [newUser, setNewUser] = useState<{ name: string; email: string; password: string; role: string; locationIds: Set<string> }>(
    { name: "", email: "", password: "", role: "MANAGER", locationIds: new Set() }
  );
  const [editUserId, setEditUserId] = useState<string>("");
  const [editUserRole, setEditUserRole] = useState<string>("MANAGER");
  const [editUserPassword, setEditUserPassword] = useState<string>("");
  const [editUserLocations, setEditUserLocations] = useState<Set<string>>(new Set());

  const locationChoices = useMemo(() => locations.map((l) => ({ value: l.id, label: `${l.name} (${l.region})` })), [locations]);

  async function loadData() {
    setLoading(true);
    setError("");
    setMessage("");
    const [orgResp, orgErr] = await api<{ organization: Organization }>("/api/admin/organizations");
    if (orgErr) {
      setError(orgErr.error || "Failed to load organization");
      setLoading(false);
      return;
    }
    setOrg(orgResp?.organization || null);
    setOrgName(orgResp?.organization?.name || "");

    const [locResp, locErr] = await api<{ locations: Location[] }>("/api/admin/locations");
    if (locErr) {
      setError(locErr.error || "Failed to load locations");
      setLoading(false);
      return;
    }
    setLocations(locResp?.locations || []);

    const [userResp, userErr] = await api<{ users: User[] }>("/api/admin/users");
    if (userErr) {
      setError(userErr.error || "Failed to load users");
      setLoading(false);
      return;
    }
    const loadedUsers = userResp?.users || [];
    setUsers(loadedUsers);
    if (loadedUsers.length > 0) {
      setEditUserId(loadedUsers[0].id);
      setEditUserRole(loadedUsers[0].role);
      setEditUserLocations(new Set(loadedUsers[0].locationIds || []));
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const toggleNewUserLocation = (id: string) => {
    const next = new Set(newUser.locationIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setNewUser({ ...newUser, locationIds: next });
  };

  const toggleEditUserLocation = (id: string) => {
    const next = new Set(editUserLocations);
    if (next.has(id)) next.delete(id); else next.add(id);
    setEditUserLocations(next);
  };

  async function saveOrgName() {
    setError(""); setMessage("");
    const [, err] = await api<{ organization: Organization }>("/api/admin/organizations", { method: "PATCH", body: JSON.stringify({ name: orgName }) });
    if (err) { setError(err.error || "Failed to update organization"); return; }
    setMessage("Organization updated");
    loadData();
  }

  async function addLocation() {
    setError(""); setMessage("");
    const [, err] = await api<{ location: Location }>("/api/admin/locations", { method: "POST", body: JSON.stringify({ id: locId.trim(), name: locName.trim(), region: locRegion.trim() }) });
    if (err) { setError(err.error || "Failed to create location"); return; }
    setLocId(""); setLocName(""); setLocRegion("");
    setMessage("Location created");
    loadData();
  }

  async function updateLocation() {
    if (!locUpdateId) return;
    setError(""); setMessage("");
    const [, err] = await api<{ location: Location }>("/api/admin/locations", { method: "PATCH", body: JSON.stringify({ id: locUpdateId, name: locUpdateName || undefined, region: locUpdateRegion || undefined }) });
    if (err) { setError(err.error || "Failed to update location"); return; }
    setMessage("Location updated");
    loadData();
  }

  async function createUser() {
    setError(""); setMessage("");
    const payload = {
      name: newUser.name.trim(),
      email: newUser.email.trim(),
      password: newUser.password,
      role: newUser.role,
      locationIds: Array.from(newUser.locationIds),
    };
    const [, err] = await api<{ user: User }>("/api/admin/users", { method: "POST", body: JSON.stringify(payload) });
    if (err) { setError(err.error || "Failed to create user"); return; }
    setNewUser({ name: "", email: "", password: "", role: "MANAGER", locationIds: new Set() });
    setMessage("User created");
    loadData();
  }

  async function updateUser() {
    if (!editUserId) return;
    setError(""); setMessage("");
    const payload: any = { role: editUserRole, locationIds: Array.from(editUserLocations) };
    if (editUserPassword) payload.password = editUserPassword;
    const [, err] = await api<{ user: User }>(`/api/admin/users/${editUserId}`, { method: "PATCH", body: JSON.stringify(payload) });
    if (err) { setError(err.error || "Failed to update user"); return; }
    setEditUserPassword("");
    setMessage("User updated");
    loadData();
  }

  const selectedUser = users.find((u) => u.id === editUserId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Admin · Tenancy & Access</h1>
          <p className="text-sm text-slate-600">Manage organization, locations, and users with role/location scopes.</p>
        </div>
        {loading && <span className="text-sm text-slate-500">Loading…</span>}
      </div>

      {message && <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-800">{message}</div>}
      {error && <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-red-800">{error}</div>}

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Organization</h2>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
          <input
            className="w-full rounded border border-slate-300 px-3 py-2 text-slate-900"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Organization name"
          />
          <button onClick={saveOrgName} className="self-start rounded bg-slate-800 px-4 py-2 text-white hover:bg-slate-900">Save</button>
        </div>
        {org && <p className="mt-2 text-sm text-slate-500">Org ID: {org.id}</p>}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Locations</h2>
          <span className="text-sm text-slate-500">{locations.length} total</span>
        </div>
        <div className="grid gap-2 md:grid-cols-3 sm:grid-cols-2">
          {locations.map((loc) => (
            <div key={loc.id} className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-sm font-semibold text-slate-800">{loc.name}</div>
              <div className="text-xs text-slate-600">{loc.id} · {loc.region}</div>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-200 pt-3 grid gap-2 md:grid-cols-4 sm:grid-cols-2">
          <input value={locId} onChange={(e) => setLocId(e.target.value)} placeholder="Location ID" className="rounded border border-slate-300 px-3 py-2 text-slate-900" />
          <input value={locName} onChange={(e) => setLocName(e.target.value)} placeholder="Name" className="rounded border border-slate-300 px-3 py-2 text-slate-900" />
          <input value={locRegion} onChange={(e) => setLocRegion(e.target.value)} placeholder="Region" className="rounded border border-slate-300 px-3 py-2 text-slate-900" />
          <button onClick={addLocation} className="rounded bg-slate-800 px-4 py-2 text-white hover:bg-slate-900">Add location</button>
        </div>
        <div className="border-t border-slate-200 pt-3 grid gap-2 md:grid-cols-4 sm:grid-cols-2">
          <select value={locUpdateId} onChange={(e) => setLocUpdateId(e.target.value)} className="rounded border border-slate-300 px-3 py-2 text-slate-900">
            <option value="">Select location to update</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name} ({loc.id})</option>
            ))}
          </select>
          <input value={locUpdateName} onChange={(e) => setLocUpdateName(e.target.value)} placeholder="New name (optional)" className="rounded border border-slate-300 px-3 py-2 text-slate-900" />
          <input value={locUpdateRegion} onChange={(e) => setLocUpdateRegion(e.target.value)} placeholder="New region (optional)" className="rounded border border-slate-300 px-3 py-2 text-slate-900" />
          <button onClick={updateLocation} className="rounded bg-slate-700 px-4 py-2 text-white hover:bg-slate-800">Update location</button>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Users</h2>
          <span className="text-sm text-slate-500">{users.length} total</span>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          {users.map((u) => {
            const locNames = u.locationIds.map((id) => locationChoices.find((l) => l.value === id)?.label || id);
            const locationsText = u.role === 'ADMIN' && u.locationIds.length === 0
              ? 'All locations (admin)'
              : (locNames.length ? locNames.join(', ') : 'None assigned');
            return (
              <div key={u.id} className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-800">{u.name} · {u.role}</div>
                  <div className="text-xs text-slate-600">{u.email}</div>
                </div>
                <div className="text-xs text-slate-600">Locations: {locationsText}</div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-slate-200 pt-3">
          <h3 className="text-sm font-semibold text-slate-900">Create user</h3>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="Name" className="rounded border border-slate-300 px-3 py-2 text-slate-900" />
            <input value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="Email" className="rounded border border-slate-300 px-3 py-2 text-slate-900" />
            <input value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="Password" type="password" className="rounded border border-slate-300 px-3 py-2 text-slate-900" />
            <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="rounded border border-slate-300 px-3 py-2 text-slate-900">
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            {locationChoices.map((loc) => (
              <label key={loc.value} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={newUser.locationIds.has(loc.value)} onChange={() => toggleNewUserLocation(loc.value)} />
                {loc.label}
              </label>
            ))}
          </div>
          <button onClick={createUser} className="mt-2 rounded bg-slate-800 px-4 py-2 text-white hover:bg-slate-900">Create user</button>
        </div>

        <div className="border-t border-slate-200 pt-3">
          <h3 className="text-sm font-semibold text-slate-900">Update user</h3>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <select value={editUserId} onChange={(e) => {
              const nextId = e.target.value; setEditUserId(nextId);
              const u = users.find((x) => x.id === nextId);
              if (u) { setEditUserRole(u.role); setEditUserLocations(new Set(u.locationIds)); }
            }} className="rounded border border-slate-300 px-3 py-2 text-slate-900">
              <option value="">Select user</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
            <select value={editUserRole} onChange={(e) => setEditUserRole(e.target.value)} className="rounded border border-slate-300 px-3 py-2 text-slate-900">
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <input value={editUserPassword} onChange={(e) => setEditUserPassword(e.target.value)} placeholder="New password (optional)" type="password" className="rounded border border-slate-300 px-3 py-2 text-slate-900" />
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            {locationChoices.map((loc) => (
              <label key={loc.value} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={editUserLocations.has(loc.value)} onChange={() => toggleEditUserLocation(loc.value)} disabled={!editUserId} />
                {loc.label}
              </label>
            ))}
          </div>
          <button onClick={updateUser} disabled={!editUserId} className="mt-2 rounded bg-slate-800 px-4 py-2 text-white hover:bg-slate-900 disabled:opacity-50">Update user</button>
          {selectedUser && <p className="mt-1 text-xs text-slate-500">Editing {selectedUser.email}</p>}
        </div>
      </section>
    </div>
  );
}
