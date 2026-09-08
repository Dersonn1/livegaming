import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../lib/api";

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [providerFilter, setProviderFilter] = useState("ALL");
  const [usernameFilter, setUsernameFilter] = useState("");

  async function refresh() {
    const [e, l] = await Promise.all([api.events(200), api.logs(200)]);
    setEvents(e);
    setLogs(l);
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  const logsByEventId = useMemo(() => {
    const map = new Map<string, any>();
    for (const log of logs) if (log.eventId) map.set(log.eventId, log);
    return map;
  }, [logs]);

  const filtered = events.filter((e) => {
    if (providerFilter !== "ALL" && e.provider !== providerFilter) return false;
    if (usernameFilter && !e.username.toLowerCase().includes(usernameFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <Layout>
      <h1 className="mb-6 text-xl font-semibold">Event Log</h1>

      <div className="mb-4 flex gap-3">
        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
        >
          {["ALL", "TIKTOK", "YOUTUBE", "SIMULATOR"].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <input
          placeholder="Filter by username"
          value={usernameFilter}
          onChange={(e) => setUsernameFilter(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Username</th>
              <th className="px-4 py-2">Provider</th>
              <th className="px-4 py-2">Event</th>
              <th className="px-4 py-2">Value</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => {
              const log = logsByEventId.get(e.id);
              return (
                <tr key={e.id} className="border-t border-border/50">
                  <td className="px-4 py-2 text-gray-400">{new Date(e.timestamp).toLocaleTimeString()}</td>
                  <td className="px-4 py-2">@{e.username}</td>
                  <td className="px-4 py-2 text-gray-400">{e.provider}</td>
                  <td className="px-4 py-2">{e.type}</td>
                  <td className="px-4 py-2 text-gray-400">{e.message || e.amount || "—"}</td>
                  <td className="px-4 py-2 text-accent">{log?.action ?? "—"}</td>
                  <td className="px-4 py-2">
                    {log ? (
                      <span
                        className={
                          log.status === "SUCCESS" || log.status === "QUEUED"
                            ? "text-good"
                            : log.status === "FAILED" || log.status === "REJECTED"
                              ? "text-bad"
                              : "text-gray-400"
                        }
                      >
                        {log.status}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                  No events match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
