import { randomUUID } from "node:crypto";
import { getPool } from "./pool";
import type { LiveEvent, Rule, RuleCreateInput } from "@live/shared";
import type { CommandLogEntry } from "../logging/logger";

/**
 * Every repository has an in-memory implementation (zero external services,
 * used for local development and tests) and a Postgres-backed one (used in
 * production whenever DATABASE_URL is set). Selection happens once, in
 * index.ts, based on env — the rest of the app only depends on the interface.
 */

export interface RuleRepository {
  list(): Promise<Rule[]>;
  get(id: string): Promise<Rule | null>;
  create(input: RuleCreateInput): Promise<Rule>;
  update(id: string, input: Partial<RuleCreateInput>): Promise<Rule | null>;
  remove(id: string): Promise<boolean>;
}

export interface EventRepository {
  save(event: LiveEvent): Promise<void>;
  list(limit: number): Promise<LiveEvent[]>;
  countSince(sinceMs: number): Promise<number>;
}

export interface CommandLogRepository {
  save(entry: CommandLogEntry & { id: string; createdAt: string }): Promise<void>;
  list(limit: number): Promise<(CommandLogEntry & { id: string; createdAt: string })[]>;
}

export interface BlockedUserRepository {
  isBlocked(userId: string, provider: string): Promise<boolean>;
  block(userId: string, username: string, provider: string, reason?: string): Promise<void>;
  unblock(userId: string, provider: string): Promise<void>;
  list(): Promise<{ userId: string; username: string; provider: string; reason?: string }[]>;
}

export interface GameConnectionRepository {
  register(name: string, apiKeyHash: string, placeId?: string): Promise<string>;
  isValidKeyHash(apiKeyHash: string): Promise<boolean>;
  touchLastSeen(apiKeyHash: string): Promise<void>;
  list(): Promise<{ id: string; name: string; placeId?: string; lastSeenAt: string | null }[]>;
}

// ---------- In-memory implementations ----------

export class InMemoryRuleRepository implements RuleRepository {
  private rules = new Map<string, Rule>();

  async list(): Promise<Rule[]> {
    return [...this.rules.values()].sort((a, b) => b.priority - a.priority);
  }
  async get(id: string): Promise<Rule | null> {
    return this.rules.get(id) ?? null;
  }
  async create(input: RuleCreateInput): Promise<Rule> {
    const now = new Date().toISOString();
    const rule: Rule = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
    this.rules.set(rule.id, rule);
    return rule;
  }
  async update(id: string, input: Partial<RuleCreateInput>): Promise<Rule | null> {
    const existing = this.rules.get(id);
    if (!existing) return null;
    const updated: Rule = { ...existing, ...input, updatedAt: new Date().toISOString() };
    this.rules.set(id, updated);
    return updated;
  }
  async remove(id: string): Promise<boolean> {
    return this.rules.delete(id);
  }
}

export class InMemoryEventRepository implements EventRepository {
  private events: LiveEvent[] = [];
  private readonly maxSize = 5000;

  async save(event: LiveEvent): Promise<void> {
    this.events.push(event);
    if (this.events.length > this.maxSize) this.events.shift();
  }
  async list(limit: number): Promise<LiveEvent[]> {
    return this.events.slice(-limit).reverse();
  }
  async countSince(sinceMs: number): Promise<number> {
    const cutoff = Date.now() - sinceMs;
    return this.events.filter((e) => new Date(e.timestamp).getTime() >= cutoff).length;
  }
}

export class InMemoryCommandLogRepository implements CommandLogRepository {
  private logs: (CommandLogEntry & { id: string; createdAt: string })[] = [];
  private readonly maxSize = 5000;

  async save(entry: CommandLogEntry & { id: string; createdAt: string }): Promise<void> {
    this.logs.push(entry);
    if (this.logs.length > this.maxSize) this.logs.shift();
  }
  async list(limit: number) {
    return this.logs.slice(-limit).reverse();
  }
}

export class InMemoryBlockedUserRepository implements BlockedUserRepository {
  private blocked = new Map<string, { userId: string; username: string; provider: string; reason?: string }>();
  private key(userId: string, provider: string) {
    return `${provider}:${userId}`;
  }
  async isBlocked(userId: string, provider: string): Promise<boolean> {
    return this.blocked.has(this.key(userId, provider));
  }
  async block(userId: string, username: string, provider: string, reason?: string): Promise<void> {
    this.blocked.set(this.key(userId, provider), { userId, username, provider, reason });
  }
  async unblock(userId: string, provider: string): Promise<void> {
    this.blocked.delete(this.key(userId, provider));
  }
  async list() {
    return [...this.blocked.values()];
  }
}

export class InMemoryGameConnectionRepository implements GameConnectionRepository {
  private connections = new Map<string, { id: string; name: string; placeId?: string; lastSeenAt: string | null; apiKeyHash: string }>();

  async register(name: string, apiKeyHash: string, placeId?: string): Promise<string> {
    const id = randomUUID();
    this.connections.set(apiKeyHash, { id, name, placeId, lastSeenAt: null, apiKeyHash });
    return id;
  }
  async isValidKeyHash(apiKeyHash: string): Promise<boolean> {
    return this.connections.has(apiKeyHash);
  }
  async touchLastSeen(apiKeyHash: string): Promise<void> {
    const conn = this.connections.get(apiKeyHash);
    if (conn) conn.lastSeenAt = new Date().toISOString();
  }
  async list() {
    return [...this.connections.values()].map(({ id, name, placeId, lastSeenAt }) => ({ id, name, placeId, lastSeenAt }));
  }
}

// ---------- Postgres implementations ----------

export class PostgresRuleRepository implements RuleRepository {
  private pool = getPool()!;

  private map(row: any): Rule {
    return {
      id: row.id,
      name: row.name,
      enabled: row.enabled,
      provider: row.provider ?? undefined,
      eventType: row.event_type,
      conditions: row.conditions,
      action: row.action,
      cooldownSeconds: row.cooldown_seconds,
      cooldownStrategy: row.cooldown_strategy,
      priority: row.priority,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  async list(): Promise<Rule[]> {
    const { rows } = await this.pool.query("SELECT * FROM rules ORDER BY priority DESC");
    return rows.map(this.map);
  }
  async get(id: string): Promise<Rule | null> {
    const { rows } = await this.pool.query("SELECT * FROM rules WHERE id = $1", [id]);
    return rows[0] ? this.map(rows[0]) : null;
  }
  async create(input: RuleCreateInput): Promise<Rule> {
    const { rows } = await this.pool.query(
      `INSERT INTO rules (name, enabled, provider, event_type, conditions, action, cooldown_seconds, cooldown_strategy, priority)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        input.name,
        input.enabled,
        input.provider ?? null,
        input.eventType,
        JSON.stringify(input.conditions),
        JSON.stringify(input.action),
        input.cooldownSeconds,
        input.cooldownStrategy,
        input.priority,
      ]
    );
    return this.map(rows[0]);
  }
  async update(id: string, input: Partial<RuleCreateInput>): Promise<Rule | null> {
    const existing = await this.get(id);
    if (!existing) return null;
    const merged = { ...existing, ...input };
    const { rows } = await this.pool.query(
      `UPDATE rules SET name=$1, enabled=$2, provider=$3, event_type=$4, conditions=$5, action=$6,
       cooldown_seconds=$7, cooldown_strategy=$8, priority=$9, updated_at=now() WHERE id=$10 RETURNING *`,
      [
        merged.name,
        merged.enabled,
        merged.provider ?? null,
        merged.eventType,
        JSON.stringify(merged.conditions),
        JSON.stringify(merged.action),
        merged.cooldownSeconds,
        merged.cooldownStrategy,
        merged.priority,
        id,
      ]
    );
    return rows[0] ? this.map(rows[0]) : null;
  }
  async remove(id: string): Promise<boolean> {
    const result = await this.pool.query("DELETE FROM rules WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  }
}

export class PostgresEventRepository implements EventRepository {
  private pool = getPool()!;

  async save(event: LiveEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO live_events (id, provider, type, user_id, username, amount, message, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
      [
        event.id,
        event.provider,
        event.type,
        event.userId,
        event.username,
        event.amount,
        event.message,
        JSON.stringify(event.metadata),
      ]
    );
  }
  async list(limit: number): Promise<LiveEvent[]> {
    const { rows } = await this.pool.query(
      "SELECT * FROM live_events ORDER BY created_at DESC LIMIT $1",
      [limit]
    );
    return rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      type: row.type,
      userId: row.user_id,
      username: row.username,
      amount: Number(row.amount),
      message: row.message,
      timestamp: row.created_at.toISOString(),
      metadata: row.metadata,
    }));
  }
  async countSince(sinceMs: number): Promise<number> {
    const { rows } = await this.pool.query(
      "SELECT count(*)::int AS c FROM live_events WHERE created_at >= now() - ($1 || ' milliseconds')::interval",
      [sinceMs]
    );
    return rows[0]?.c ?? 0;
  }
}

export class PostgresCommandLogRepository implements CommandLogRepository {
  private pool = getPool()!;

  async save(entry: CommandLogEntry & { id: string; createdAt: string }): Promise<void> {
    await this.pool.query(
      `INSERT INTO command_logs (id, command_id, event_id, provider, username, action, status, latency_ms)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        entry.id,
        entry.commandId,
        entry.eventId ?? null,
        entry.provider ?? null,
        entry.username ?? null,
        entry.action,
        entry.status,
        entry.latencyMs ?? null,
      ]
    );
  }
  async list(limit: number) {
    const { rows } = await this.pool.query(
      "SELECT * FROM command_logs ORDER BY created_at DESC LIMIT $1",
      [limit]
    );
    return rows.map((row) => ({
      id: row.id,
      commandId: row.command_id,
      eventId: row.event_id,
      provider: row.provider,
      username: row.username,
      action: row.action,
      status: row.status,
      latencyMs: row.latency_ms,
      createdAt: row.created_at.toISOString(),
    }));
  }
}

export class PostgresBlockedUserRepository implements BlockedUserRepository {
  private pool = getPool()!;

  async isBlocked(userId: string, provider: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      "SELECT 1 FROM blocked_users WHERE user_id=$1 AND provider=$2",
      [userId, provider]
    );
    return rows.length > 0;
  }
  async block(userId: string, username: string, provider: string, reason?: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO blocked_users (user_id, username, provider, reason) VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, provider) DO UPDATE SET reason = EXCLUDED.reason`,
      [userId, username, provider, reason ?? null]
    );
  }
  async unblock(userId: string, provider: string): Promise<void> {
    await this.pool.query("DELETE FROM blocked_users WHERE user_id=$1 AND provider=$2", [userId, provider]);
  }
  async list() {
    const { rows } = await this.pool.query("SELECT * FROM blocked_users ORDER BY created_at DESC");
    return rows.map((r) => ({ userId: r.user_id, username: r.username, provider: r.provider, reason: r.reason }));
  }
}

export class PostgresGameConnectionRepository implements GameConnectionRepository {
  private pool = getPool()!;

  async register(name: string, apiKeyHash: string, placeId?: string): Promise<string> {
    const { rows } = await this.pool.query(
      "INSERT INTO game_connections (name, api_key_hash, place_id) VALUES ($1,$2,$3) RETURNING id",
      [name, apiKeyHash, placeId ?? null]
    );
    return rows[0].id;
  }
  async isValidKeyHash(apiKeyHash: string): Promise<boolean> {
    const { rows } = await this.pool.query("SELECT 1 FROM game_connections WHERE api_key_hash=$1", [apiKeyHash]);
    return rows.length > 0;
  }
  async touchLastSeen(apiKeyHash: string): Promise<void> {
    await this.pool.query("UPDATE game_connections SET last_seen_at = now() WHERE api_key_hash=$1", [apiKeyHash]);
  }
  async list() {
    const { rows } = await this.pool.query("SELECT * FROM game_connections ORDER BY created_at DESC");
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      placeId: r.place_id,
      lastSeenAt: r.last_seen_at ? r.last_seen_at.toISOString() : null,
    }));
  }
}
