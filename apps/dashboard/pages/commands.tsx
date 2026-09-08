import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../lib/api";

export default function CommandsPage() {
  const [types, setTypes] = useState<{ type: string; defaultCooldownSeconds: number }[]>([]);
  const [selected, setSelected] = useState("SPAWN_BOSS");
  const [amount, setAmount] = useState(1);
  const [result, setResult] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.commandTypes().then(setTypes);
  }, []);

  async function execute() {
    setSending(true);
    setResult(null);
    try {
      const command = await api.testCommand(selected, { amount });
      setResult(`Queued: ${command.id} (expires ${new Date(command.expiresAt).toLocaleTimeString()})`);
    } catch (e: any) {
      setResult(`Error: ${e.message}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <Layout>
      <h1 className="mb-6 text-xl font-semibold">Game Commands</h1>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="rounded-lg border border-border bg-panel p-4">
          <div className="mb-3 text-sm text-gray-400">Available command types</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {types.map((t) => (
              <button
                key={t.type}
                onClick={() => setSelected(t.type)}
                className={`rounded-md border px-3 py-2 text-left text-sm ${
                  selected === t.type ? "border-accent text-accent" : "border-border text-gray-300 hover:border-accent/50"
                }`}
              >
                {t.type}
                <div className="text-[10px] text-gray-500">cooldown {t.defaultCooldownSeconds}s</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-panel p-4">
          <div className="mb-3 text-sm text-gray-400">Test manually</div>
          <label className="mb-1 block text-xs text-gray-400">Selected</label>
          <div className="mb-3 rounded-md border border-border bg-surface px-3 py-2 text-sm">{selected}</div>

          <label className="mb-1 block text-xs text-gray-400">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="mb-4 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
          />

          <button
            onClick={execute}
            disabled={sending}
            className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            EXECUTE
          </button>

          {result && <p className="mt-3 text-xs text-gray-400">{result}</p>}
          <p className="mt-3 text-xs text-gray-600">
            Sends a real command to the queue. Roblox executes it on its next poll if a game server is connected.
          </p>
        </div>
      </div>
    </Layout>
  );
}
