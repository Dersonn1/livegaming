import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../lib/api";

const PROVIDERS = ["TIKTOK", "YOUTUBE"] as const;

export default function LivePage() {
  const [status, setStatus] = useState<Record<string, any>>({});
  const [channel, setChannel] = useState<Record<string, string>>({ TIKTOK: "", YOUTUBE: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setStatus(await api.liveStatus());
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, []);

  async function connect(provider: string) {
    setError(null);
    setBusy(provider);
    try {
      await api.liveConnect(provider, channel[provider]);
      await refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(provider: string) {
    setBusy(provider);
    await api.liveDisconnect(provider);
    await refresh();
    setBusy(null);
  }

  return (
    <Layout>
      <h1 className="mb-6 text-xl font-semibold">Live Control</h1>

      {error && <p className="mb-4 rounded-md bg-bad/10 p-3 text-sm text-bad">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {PROVIDERS.map((provider) => {
          const s = status[provider] ?? {};
          return (
            <div key={provider} className="rounded-lg border border-border bg-panel p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">{provider}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    s.status === "CONNECTED"
                      ? "bg-good/20 text-good"
                      : s.status === "ERROR"
                        ? "bg-bad/20 text-bad"
                        : "bg-white/10 text-gray-400"
                  }`}
                >
                  {s.status ?? "DISCONNECTED"}
                </span>
              </div>

              <input
                placeholder={provider === "TIKTOK" ? "TikTok username" : "YouTube video/channel id"}
                value={channel[provider]}
                onChange={(e) => setChannel((c) => ({ ...c, [provider]: e.target.value }))}
                className="mb-3 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => connect(provider)}
                  disabled={busy === provider || !channel[provider]}
                  className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  Connect
                </button>
                <button
                  onClick={() => disconnect(provider)}
                  disabled={busy === provider}
                  className="rounded-md border border-border px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  Disconnect
                </button>
              </div>

              <dl className="mt-3 space-y-1 text-xs text-gray-500">
                <div className="flex justify-between">
                  <dt>Last event</dt>
                  <dd>{s.lastEventAt ? new Date(s.lastEventAt).toLocaleTimeString() : "—"}</dd>
                </div>
                {s.error && <div className="text-bad">{s.error}</div>}
              </dl>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-gray-500">
        TikTok has no official public LIVE-events API — see docs/TIKTOK.md before enabling it. YouTube uses the
        official YouTube Data API v3 — see docs/YOUTUBE.md for the required API key and its coverage limits.
      </p>
    </Layout>
  );
}
