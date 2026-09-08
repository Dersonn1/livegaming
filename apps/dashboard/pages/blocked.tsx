import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../lib/api";

export default function BlockedUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({ userId: "", username: "", provider: "SIMULATOR", reason: "" });

  async function refresh() {
    setUsers(await api.blockedUsers());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function block(e: React.FormEvent) {
    e.preventDefault();
    await api.blockUser(form);
    setForm({ userId: "", username: "", provider: "SIMULATOR", reason: "" });
    await refresh();
  }

  async function unblock(provider: string, userId: string) {
    await api.unblockUser(provider, userId);
    await refresh();
  }

  return (
    <Layout>
      <h1 className="mb-6 text-xl font-semibold">Blocked Users</h1>

      <form onSubmit={block} className="mb-6 grid gap-3 rounded-lg border border-border bg-panel p-4 md:grid-cols-5">
        <input
          placeholder="userId"
          value={form.userId}
          onChange={(e) => setForm({ ...form, userId: e.target.value })}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
          required
        />
        <input
          placeholder="username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
          required
        />
        <select
          value={form.provider}
          onChange={(e) => setForm({ ...form, provider: e.target.value })}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
        >
          {["TIKTOK", "YOUTUBE", "SIMULATOR"].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <input
          placeholder="reason (optional)"
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white">
          Block
        </button>
      </form>

      <div className="space-y-2">
        {users.map((u) => (
          <div key={`${u.provider}:${u.userId}`} className="flex items-center justify-between rounded-lg border border-border bg-panel p-3">
            <div className="text-sm">
              @{u.username} <span className="text-gray-500">({u.provider})</span>
              {u.reason && <span className="ml-2 text-xs text-gray-500">— {u.reason}</span>}
            </div>
            <button onClick={() => unblock(u.provider, u.userId)} className="text-xs text-bad hover:underline">
              Unblock
            </button>
          </div>
        ))}
        {users.length === 0 && <p className="text-sm text-gray-500">No blocked users.</p>}
      </div>
    </Layout>
  );
}
