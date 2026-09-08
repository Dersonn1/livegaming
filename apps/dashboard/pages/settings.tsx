import { useState } from "react";
import Layout from "../components/Layout";
import { api } from "../lib/api";

export default function SettingsPage() {
  const [name, setName] = useState("Studio Test Server");
  const [result, setResult] = useState<{ apiKey: string; warning: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function register() {
    setBusy(true);
    try {
      setResult(await api.robloxRegister(name));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout>
      <h1 className="mb-6 text-xl font-semibold">Settings</h1>

      <div className="mb-6 rounded-lg border border-border bg-panel p-4">
        <h2 className="mb-2 text-sm font-semibold">Register a Roblox game connection</h2>
        <p className="mb-3 text-xs text-gray-500">
          Generates a dedicated API key for a Roblox server to use in ServerScriptService/Security/Config.lua, instead
          of the shared bootstrap ROBLOX_API_KEY. The key is shown only once.
        </p>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm"
          />
          <button
            onClick={register}
            disabled={busy}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Generate key
          </button>
        </div>

        {result && (
          <div className="mt-4 rounded-md border border-warn/40 bg-warn/10 p-3 text-xs">
            <div className="mb-1 font-mono break-all text-warn">{result.apiKey}</div>
            <div className="text-gray-400">{result.warning}</div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-panel p-4 text-xs text-gray-500">
        <p className="mb-2 font-semibold text-gray-300">Where things live</p>
        <ul className="list-inside list-disc space-y-1">
          <li>Backend env: apps/backend/.env (copy from .env.example)</li>
          <li>Roblox secrets: roblox/game/src/ServerScriptService/Security/Config.lua</li>
          <li>Full setup guide: docs/SETUP.md</li>
        </ul>
      </div>
    </Layout>
  );
}
