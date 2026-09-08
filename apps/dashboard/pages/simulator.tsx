import { useState } from "react";
import Layout from "../components/Layout";
import { api } from "../lib/api";

const QUICK_ACTIONS: { label: string; type: string; amount?: number; message?: string; metadata?: any }[] = [
  { label: "+ Follow", type: "FOLLOW" },
  { label: "+ 10 Likes", type: "LIKE", amount: 10 },
  { label: "+ 100 Likes", type: "LIKE", amount: 100 },
  { label: "Gift: Rose", type: "GIFT", amount: 1, metadata: { giftName: "rose" } },
  { label: "Donation $10", type: "DONATION", amount: 10 },
  { label: "Comment !meteor", type: "COMMENT", message: "!meteor" },
];

export default function SimulatorPage() {
  const [username, setUsername] = useState("test_user");
  const [message, setMessage] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  async function send(type: string, amount?: number, msg?: string, metadata?: any) {
    setSending(true);
    try {
      const event = await api.simulate({ type, username, amount, message: msg ?? message, metadata });
      setLog((prev) => [`${new Date().toLocaleTimeString()}  ${type}  ${JSON.stringify(event)}`, ...prev].slice(0, 30));
    } catch (e: any) {
      setLog((prev) => [`ERROR: ${e.message}`, ...prev].slice(0, 30));
    } finally {
      setSending(false);
    }
  }

  return (
    <Layout>
      <h1 className="mb-2 text-xl font-semibold">Live Simulator</h1>
      <p className="mb-6 text-sm text-gray-500">
        Events sent here go through the exact same pipeline as a real TikTok/YouTube event: Normalizer → Rule Engine →
        Command Queue → Roblox. Use this to test rules end-to-end before connecting a real LIVE.
      </p>

      <div className="mb-6 grid gap-4 md:grid-cols-[280px_1fr]">
        <div className="rounded-lg border border-border bg-panel p-4">
          <label className="mb-1 block text-xs text-gray-400">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mb-3 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <label className="mb-1 block text-xs text-gray-400">Message (for comment/gift)</label>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="!meteor"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>

        <div className="rounded-lg border border-border bg-panel p-4">
          <div className="mb-3 text-sm text-gray-400">Quick actions</div>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                disabled={sending}
                onClick={() => send(action.type, action.amount, action.message, action.metadata)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm hover:border-accent hover:text-accent disabled:opacity-50"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-panel p-4">
        <div className="mb-2 text-sm text-gray-400">Sent events</div>
        <div className="max-h-96 space-y-1 overflow-y-auto font-mono text-xs text-gray-400">
          {log.length === 0 && <p className="text-gray-600">Nothing sent yet.</p>}
          {log.map((line, i) => (
            <div key={i} className="border-b border-border/50 py-1">
              {line}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
