import { z } from "zod";
import { GameCommandType } from "@live/shared";

export interface CommandHandlerContext {
  cooldownSeconds: number;
}

/**
 * Each Roblox-bound command type gets its own handler: its own payload
 * schema, its own cooldown default, and its own validation. The
 * CommandRegistry below dispatches by type via a Map — no giant if/switch.
 */
export interface CommandHandler<TPayload = any> {
  readonly type: GameCommandType;
  readonly payloadSchema: z.ZodType<TPayload>;
  readonly defaultCooldownSeconds: number;
  /** Normalizes/clamps raw params coming from a Rule action or manual test call. */
  buildPayload(rawParams: Record<string, unknown>, multiplier: number): TPayload;
}

function makeHandler<T>(
  type: GameCommandType,
  payloadSchema: z.ZodType<T>,
  defaultCooldownSeconds: number,
  buildPayload: (raw: Record<string, unknown>, multiplier: number) => T
): CommandHandler<T> {
  return { type, payloadSchema, defaultCooldownSeconds, buildPayload };
}

const clampInt = (v: unknown, fallback: number, min: number, max: number) => {
  const n = Math.round(Number(v ?? fallback));
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : fallback));
};

export const commandHandlers: CommandHandler[] = [
  makeHandler(
    "SPAWN_ENEMY",
    z.object({ amount: z.number().int().min(1).max(100), enemyType: z.string().default("basic") }),
    2,
    (raw, mult) => ({
      amount: clampInt((raw.amount as number) ?? mult, 1, 1, 100),
      enemyType: String(raw.enemyType ?? "basic"),
    })
  ),
  makeHandler(
    "SPAWN_BOSS",
    z.object({ bossType: z.string().default("default"), amount: z.number().int().min(1).max(5) }),
    30,
    (raw, mult) => ({ bossType: String(raw.bossType ?? "default"), amount: clampInt(raw.amount, mult || 1, 1, 5) })
  ),
  makeHandler(
    "SPAWN_METEOR",
    z.object({ amount: z.number().int().min(1).max(50), durationSeconds: z.number().min(1).max(120) }),
    30,
    (raw, mult) => ({
      amount: clampInt(raw.amount ?? mult, 5, 1, 50),
      durationSeconds: clampInt(raw.durationSeconds, 10, 1, 120),
    })
  ),
  makeHandler(
    "CHANGE_GRAVITY",
    z.object({ value: z.number().min(10).max(500), durationSeconds: z.number().min(1).max(300) }),
    10,
    (raw) => ({ value: Number(raw.value ?? 196.2), durationSeconds: clampInt(raw.durationSeconds, 30, 1, 300) })
  ),
  makeHandler(
    "CHANGE_SPEED",
    z.object({ multiplier: z.number().min(0.1).max(5), durationSeconds: z.number().min(1).max(300) }),
    10,
    (raw) => ({ multiplier: Number(raw.multiplier ?? 1.5), durationSeconds: clampInt(raw.durationSeconds, 30, 1, 300) })
  ),
  makeHandler(
    "GIVE_ITEM",
    z.object({ itemId: z.string(), quantity: z.number().int().min(1).max(99) }),
    1,
    (raw) => ({ itemId: String(raw.itemId ?? "unknown"), quantity: clampInt(raw.quantity, 1, 1, 99) })
  ),
  makeHandler(
    "REMOVE_ITEM",
    z.object({ itemId: z.string(), quantity: z.number().int().min(1).max(99) }),
    1,
    (raw) => ({ itemId: String(raw.itemId ?? "unknown"), quantity: clampInt(raw.quantity, 1, 1, 99) })
  ),
  makeHandler(
    "HEAL_PLAYER",
    z.object({ amount: z.number().min(1).max(1000) }),
    2,
    (raw) => ({ amount: Number(raw.amount ?? 25) })
  ),
  makeHandler(
    "DAMAGE_PLAYER",
    z.object({ amount: z.number().min(1).max(1000) }),
    2,
    (raw) => ({ amount: Number(raw.amount ?? 10) })
  ),
  makeHandler(
    "TELEPORT_PLAYER",
    z.object({ destination: z.string() }),
    3,
    (raw) => ({ destination: String(raw.destination ?? "spawn") })
  ),
  makeHandler("START_EVENT", z.object({ eventName: z.string() }), 5, (raw) => ({
    eventName: String(raw.eventName ?? "special_event"),
  })),
  makeHandler("END_EVENT", z.object({ eventName: z.string() }), 0, (raw) => ({
    eventName: String(raw.eventName ?? "special_event"),
  })),
  makeHandler(
    "CHANGE_WEATHER",
    z.object({ weather: z.enum(["clear", "rain", "storm", "snow"]) }),
    5,
    (raw) => ({ weather: (raw.weather as any) ?? "clear" })
  ),
  makeHandler(
    "CHANGE_TIME",
    z.object({ clockTime: z.number().min(0).max(24) }),
    5,
    (raw) => ({ clockTime: Number(raw.clockTime ?? 12) })
  ),
  makeHandler(
    "SPAWN_NPC",
    z.object({ npcType: z.string(), amount: z.number().int().min(1).max(20) }),
    5,
    (raw, mult) => ({ npcType: String(raw.npcType ?? "villager"), amount: clampInt(raw.amount ?? mult, 1, 1, 20) })
  ),
  makeHandler(
    "EXPLOSION",
    z.object({ radius: z.number().min(1).max(100), position: z.string().default("random") }),
    5,
    (raw) => ({ radius: Number(raw.radius ?? 10), position: String(raw.position ?? "random") })
  ),
  makeHandler("FREEZE_PLAYERS", z.object({ durationSeconds: z.number().min(1).max(120) }), 15, (raw) => ({
    durationSeconds: clampInt(raw.durationSeconds, 10, 1, 120),
  })),
  makeHandler("UNFREEZE_PLAYERS", z.object({}), 0, () => ({})),
];

export const commandHandlerRegistry = new Map<GameCommandType, CommandHandler>(
  commandHandlers.map((h) => [h.type, h])
);
