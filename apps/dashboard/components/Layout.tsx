import Link from "next/link";
import { useRouter } from "next/router";
import { clearToken } from "../lib/api";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/live", label: "Live" },
  { href: "/rules", label: "Rules" },
  { href: "/commands", label: "Commands" },
  { href: "/simulator", label: "Simulator" },
  { href: "/events", label: "Events" },
  { href: "/blocked", label: "Blocked Users" },
  { href: "/settings", label: "Settings" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen bg-surface text-gray-100">
      <aside className="w-56 shrink-0 border-r border-border bg-panel px-4 py-6">
        <div className="mb-8 px-2 text-lg font-semibold tracking-tight">
          Live<span className="text-accent">→</span>Roblox
        </div>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                router.pathname === item.href
                  ? "bg-accent/20 text-accent"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={() => {
            clearToken();
            router.push("/login");
          }}
          className="mt-8 w-full rounded-md border border-border px-3 py-2 text-left text-sm text-gray-400 hover:bg-white/5"
        >
          Log out
        </button>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
