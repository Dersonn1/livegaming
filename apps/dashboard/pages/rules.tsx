import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../lib/api";

const EVENT_TYPES = ["FOLLOW", "LIKE", "LIKE_MILESTONE", "COMMENT", "GIFT", "DONATION", "SUBSCRIPTION", "MEMBERSHIP", "SHARE", "JOIN"];
const COMMAND_TYPES = [
  "SPAWN_ENEMY", "SPAWN_BOSS", "SPAWN_METEOR", "CHANGE_GRAVITY", "CHANGE_SPEED", "GIVE_ITEM", "REMOVE_ITEM",
  "HEAL_PLAYER", "DAMAGE_PLAYER", "TELEPORT_PLAYER", "START_EVENT", "END_EVENT", "CHANGE_WEATHER", "CHANGE_TIME",
  "SPAWN_NPC", "EXPLOSION", "FREEZE_PLAYERS", "UNFREEZE_PLAYERS",
];
const CONDITION_FIELDS = ["amount", "giftName", "username", "commentContains", "likesTotal"];

const emptyForm = {
  name: "",
  eventType: "GIFT",
  conditionField: "giftName",
  conditionOp: "eq",
  conditionValue: "",
  command: "SPAWN_ENEMY",
  amount: 1,
  cooldownSeconds: 0,
  cooldownStrategy: "IGNORE",
  priority: 0,
};

export default function RulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setRules(await api.rules());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createRule(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const conditions = form.conditionValue
        ? [
            {
              field: form.conditionField,
              op: form.conditionField === "commentContains" || form.conditionField === "giftName" || form.conditionField === "username" ? "eq" : form.conditionOp,
              value: ["amount", "likesTotal"].includes(form.conditionField) ? Number(form.conditionValue) : form.conditionValue,
            },
          ]
        : [];

      await api.createRule({
        name: form.name || `${form.eventType} -> ${form.command}`,
        enabled: true,
        eventType: form.eventType,
        conditions,
        action: { command: form.command, params: { amount: Number(form.amount) }, priority: "NORMAL" },
        cooldownSeconds: Number(form.cooldownSeconds),
        cooldownStrategy: form.cooldownStrategy,
        priority: Number(form.priority),
      });
      setForm(emptyForm);
      await refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(rule: any) {
    await api.updateRule(rule.id, { enabled: !rule.enabled });
    await refresh();
  }

  async function remove(id: string) {
    await api.deleteRule(id);
    await refresh();
  }

  return (
    <Layout>
      <h1 className="mb-6 text-xl font-semibold">Rule Builder</h1>

      <form onSubmit={createRule} className="mb-8 rounded-lg border border-border bg-panel p-4">
        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-gray-400">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">IF Event</label>
            <select
              value={form.eventType}
              onChange={(e) => setForm({ ...form, eventType: e.target.value })}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">THEN Action</label>
            <select
              value={form.command}
              onChange={(e) => setForm({ ...form, command: e.target.value })}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            >
              {COMMAND_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4 grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-gray-400">Condition field</label>
            <select
              value={form.conditionField}
              onChange={(e) => setForm({ ...form, conditionField: e.target.value })}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            >
              {CONDITION_FIELDS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Operator</label>
            <select
              value={form.conditionOp}
              onChange={(e) => setForm({ ...form, conditionOp: e.target.value })}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              disabled={["giftName", "username", "commentContains"].includes(form.conditionField)}
            >
              {["eq", "ne", "gt", "gte", "lt", "lte"].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Value</label>
            <input
              value={form.conditionValue}
              onChange={(e) => setForm({ ...form, conditionValue: e.target.value })}
              placeholder="rose / 100 / !meteor"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Amount / param</label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-gray-400">Cooldown (seconds)</label>
            <input
              type="number"
              value={form.cooldownSeconds}
              onChange={(e) => setForm({ ...form, cooldownSeconds: Number(e.target.value) })}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Cooldown strategy</label>
            <select
              value={form.cooldownStrategy}
              onChange={(e) => setForm({ ...form, cooldownStrategy: e.target.value })}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            >
              {["IGNORE", "ACCUMULATE", "ESCALATE"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Priority (higher runs first)</label>
            <input
              type="number"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            />
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-bad">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Save Rule
        </button>
      </form>

      <div className="space-y-2">
        {rules.map((rule) => (
          <div key={rule.id} className="flex items-center justify-between rounded-lg border border-border bg-panel p-3">
            <div>
              <div className="text-sm font-medium">{rule.name}</div>
              <div className="text-xs text-gray-500">
                {rule.eventType} {rule.conditions.length > 0 && `(${rule.conditions.map((c: any) => `${c.field} ${c.op} ${c.value}`).join(", ")})`} →{" "}
                {rule.action.command} · cooldown {rule.cooldownSeconds}s · priority {rule.priority}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggle(rule)}
                className={`rounded-full px-2 py-0.5 text-xs ${rule.enabled ? "bg-good/20 text-good" : "bg-white/10 text-gray-400"}`}
              >
                {rule.enabled ? "Enabled" : "Disabled"}
              </button>
              <button onClick={() => remove(rule.id)} className="text-xs text-bad hover:underline">
                Delete
              </button>
            </div>
          </div>
        ))}
        {rules.length === 0 && <p className="text-sm text-gray-500">No rules yet.</p>}
      </div>
    </Layout>
  );
}
