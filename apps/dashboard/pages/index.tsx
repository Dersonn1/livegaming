import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import StatCard from "../components/StatCard";
import { api } from "../lib/api";
import { useLiveSocket } from "../lib/useLiveSocket";

interface FeedItem {
  id: string;
  kind: "event" | "command";
  timestamp: string;
  summary: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState({ eventsPerMinute: 0, eventsLastHour: 0 });
  const [robloxStatus, setRobloxStatus] = useState<{ connected: boolean; pendingCommands: number } | null>(null);
  const [liveStatus, setLiveStatus] = useState<Record<string, any>>({});
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [errorCount, setErrorCount] = useState(0);

  async function refresh() {
    const [s, r, l] = await Promise.all([api.eventStats(), api.robloxStatus(), api.liveStatus()]);
    setStats(s);
    setRobloxStatus(r);
    setLiveStatus(l);
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  useLiveSocket((msg) => {
    if (msg.type === "live_event") {
      const e = msg.data;
      setFeed((prev) =>
        [
          {
            id: e.id,
            kind: "event" as const,
            timestamp: e.timestamp,
            summary: `@${e.username} → ${e.type}${e.message ? ` "${e.message}"` : ""}`,
          },
          ...prev,
        ].slice(0, 50)
      );
    }
    if (msg.type === "command_log") {
      const c = msg.data;
      if (c.status === "FAILED" || c.status === "REJECTED") setErrorCount((n) => n + 1);
      setFeed((prev) =>
        [
          {
            id: c.id ?? c.commandId,
            kind: "command" as const,
            timestamp: c.createdAt ?? new Date().toISOString(),
            summary: `${c.action} → ${c.status}`,
          },
          ...prev,
        ].slice(0, 50)
      );
    }
  });

  const anyConnected = Object.values(liveStatus).some((s: any) => s.status === "CONNECTED");

  return (
    <Layout>
      <h1 className="mb-6 text-xl font-semibold">Dashboard</h1>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Live Status" value={anyConnected ? "🟢 Connected" : "⚪ Disconnected"} />
        <StatCard label="Events / min" value={stats.eventsPerMinute} />
        <StatCard label="Events (1h)" value={stats.eventsLastHour} />
        <StatCard label="Pending Commands" value={robloxStatus?.pendingCommands ?? "-"} />
        <StatCard label="Errors" value={errorCount} accent={errorCount > 0 ? "bad" : "good"} />
      </div>

      <div className="mb-6 rounded-lg border border-border bg-panel p-4">
        <div className="mb-2 text-sm text-gray-400">Roblox Gateway</div>
        <div className="flex items-center gap-2 text-sm">
          <span className={robloxStatus?.connected ? "text-good" : "text-warn"}>
            {robloxStatus?.connected ? "● Polling" : "● Waiting for first poll"}
          </span>
          <span className="text-gray-500">— {robloxStatus?.pendingCommands ?? 0} command(s) queued</span>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-panel p-4">
        <div className="mb-3 text-sm text-gray-400">Live Activity</div>
        <div className="max-h-[420px] space-y-1 overflow-y-auto font-mono text-xs">
          {feed.length === 0 && <p className="text-gray-500">No activity yet — try the Live Simulator.</p>}
          {feed.map((item) => (
            <div key={item.id + item.timestamp} className="flex gap-3 border-b border-border/50 py-1">
              <span className="text-gray-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
              <span className={item.kind === "command" ? "text-accent" : "text-gray-300"}>{item.summary}</span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
