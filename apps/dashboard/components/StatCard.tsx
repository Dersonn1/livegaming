export default function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: "good" | "bad" | "warn";
}) {
  const color = accent === "good" ? "text-good" : accent === "bad" ? "text-bad" : accent === "warn" ? "text-warn" : "text-gray-100";
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}
