import { useState } from "react";
import { useRouter } from "next/router";
import { api, setToken } from "../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token } = await api.login(username, password);
      setToken(token);
      router.push("/");
    } catch {
      setError("Invalid credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface text-gray-100">
      <form onSubmit={handleSubmit} className="w-80 rounded-lg border border-border bg-panel p-6">
        <h1 className="mb-1 text-lg font-semibold">Live → Roblox Platform</h1>
        <p className="mb-6 text-sm text-gray-400">Sign in to the dashboard</p>

        <label className="mb-1 block text-xs text-gray-400">Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mb-4 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />

        <label className="mb-1 block text-xs text-gray-400">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />

        {error && <p className="mb-4 text-sm text-bad">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <p className="mt-4 text-xs text-gray-500">
          Default credentials come from DASHBOARD_ADMIN_USER / DASHBOARD_ADMIN_PASSWORD in the backend .env.
        </p>
      </form>
    </div>
  );
}
