import { z } from "zod";

export const GameCommandType = z.enum([
  "SPAWN_ENEMY",
  "SPAWN_BOSS",
  "SPAWN_METEOR",
  "CHANGE_GRAVITY",
  "CHANGE_SPEED",
  "GIVE_ITEM",
  "REMOVE_ITEM",
  "HEAL_PLAYER",
  "DAMAGE_PLAYER",
  "TELEPORT_PLAYER",
  "START_EVENT",
  "END_EVENT",
  "CHANGE_WEATHER",
  "CHANGE_TIME",
  "SPAWN_NPC",
  "EXPLOSION",
  "FREEZE_PLAYERS",
  "UNFREEZE_PLAYERS",
]);
export type GameCommandType = z.infer<typeof GameCommandType>;

export const CommandPriority = z.enum(["HIGH", "NORMAL", "LOW"]);
export type CommandPriority = z.infer<typeof CommandPriority>;

/**
 * Payload shapes per command type. Kept loose (z.record) at the wire level
 * for forward-compatibility, but each CommandHandler on the backend AND on
 * the Roblox side validates against its own strict schema before acting.
 */
export const GameCommandSchema = z.object({
  id: z.string().uuid(),
  type: GameCommandType,
  payload: z.record(z.unknown()).default({}),
  priority: CommandPriority.default("NORMAL"),
  timestamp: z.string().datetime(),
  expiresAt: z.string().datetime(),
  sourceEventId: z.string().uuid().optional(),
  nonce: z.string(),
});
export type GameCommand = z.infer<typeof GameCommandSchema>;

/**
 * Envelope sent to Roblox on each poll. `signedPayload` is the EXACT JSON
 * string the signature was computed over — Roblox verifies
 * hmac(signedPayload) == signature and only then JSON-decodes
 * signedPayload to get `commands`/`issuedAt`. Sending the raw signed string
 * (rather than making Roblox re-serialize the parsed object) avoids any
 * risk of the two sides producing differently-formatted JSON for the same
 * data and the signature check failing/mismatching for the wrong reason.
 */
export const CommandBatchEnvelopeSchema = z.object({
  commands: z.array(GameCommandSchema),
  issuedAt: z.string().datetime(),
  signedPayload: z.string(),
  signature: z.string(),
});
export type CommandBatchEnvelope = z.infer<typeof CommandBatchEnvelopeSchema>;

export const CommandAckSchema = z.object({
  commandId: z.string().uuid(),
  status: z.enum(["SUCCESS", "FAILED", "REJECTED"]),
  error: z.string().optional(),
  executedAt: z.string().datetime(),
});
export type CommandAck = z.infer<typeof CommandAckSchema>;
