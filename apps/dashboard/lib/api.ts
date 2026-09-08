const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string): void {
  localStorage.setItem("token", token);
}

export function clearToken(): void {
  localStorage.removeItem("token");
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && typeof window !== "undefined") {
    clearToken();
    window.location.href = "/login";
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, body.error ? JSON.stringify(body.error) : "Request failed");
  }
  return body as T;
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string }>("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),

  liveStatus: () => request<Record<string, any>>("/api/live/status"),
  liveConnect: (provider: string, channel: string) =>
    request("/api/live/connect", { method: "POST", body: JSON.stringify({ provider, channel }) }),
  liveDisconnect: (provider: string) =>
    request("/api/live/disconnect", { method: "POST", body: JSON.stringify({ provider }) }),

  events: (limit = 100) => request<any[]>(`/api/events?limit=${limit}`),
  eventStats: () => request<{ eventsPerMinute: number; eventsLastHour: number }>("/api/events/stats"),

  rules: () => request<any[]>("/api/rules"),
  createRule: (rule: any) => request("/api/rules", { method: "POST", body: JSON.stringify(rule) }),
  updateRule: (id: string, rule: any) => request(`/api/rules/${id}`, { method: "PUT", body: JSON.stringify(rule) }),
  deleteRule: (id: string) => request(`/api/rules/${id}`, { method: "DELETE" }),

  commandTypes: () => request<{ type: string; defaultCooldownSeconds: number }[]>("/api/commands"),
  testCommand: (type: string, params: Record<string, unknown>) =>
    request<{ id: string; expiresAt: string }>("/api/commands/test", {
      method: "POST",
      body: JSON.stringify({ type, params }),
    }),
  logs: (limit = 100) => request<any[]>(`/api/logs?limit=${limit}`),

  simulate: (payload: Record<string, unknown>) =>
    request("/api/simulator/event", { method: "POST", body: JSON.stringify(payload) }),

  robloxStatus: () => request<{ connected: boolean; lastPollAt: string | null; pendingCommands: number }>(
    "/api/roblox/status"
  ),
  robloxRegister: (name: string) =>
    request<{ apiKey: string; warning: string }>("/api/roblox/register", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  blockedUsers: () => request<any[]>("/api/blocked-users"),
  blockUser: (payload: { userId: string; username: string; provider: string; reason?: string }) =>
    request("/api/blocked-users", { method: "POST", body: JSON.stringify(payload) }),
  unblockUser: (provider: string, userId: string) =>
    request(`/api/blocked-users/${provider}/${userId}`, { method: "DELETE" }),
};

export function wsUrl(): string {
  return process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000/ws";
}
