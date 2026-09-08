"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandAckSchema = exports.CommandBatchEnvelopeSchema = exports.GameCommandSchema = exports.CommandPriority = exports.GameCommandType = void 0;
const zod_1 = require("zod");
exports.GameCommandType = zod_1.z.enum([
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
exports.CommandPriority = zod_1.z.enum(["HIGH", "NORMAL", "LOW"]);
/**
 * Payload shapes per command type. Kept loose (z.record) at the wire level
 * for forward-compatibility, but each CommandHandler on the backend AND on
 * the Roblox side validates against its own strict schema before acting.
 */
exports.GameCommandSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: exports.GameCommandType,
    payload: zod_1.z.record(zod_1.z.unknown()).default({}),
    priority: exports.CommandPriority.default("NORMAL"),
    timestamp: zod_1.z.string().datetime(),
    expiresAt: zod_1.z.string().datetime(),
    sourceEventId: zod_1.z.string().uuid().optional(),
    nonce: zod_1.z.string(),
});
/** Envelope sent to Roblox on each poll, with an HMAC signature over the body. */
exports.CommandBatchEnvelopeSchema = zod_1.z.object({
    commands: zod_1.z.array(exports.GameCommandSchema),
    issuedAt: zod_1.z.string().datetime(),
    signature: zod_1.z.string(),
});
exports.CommandAckSchema = zod_1.z.object({
    commandId: zod_1.z.string().uuid(),
    status: zod_1.z.enum(["SUCCESS", "FAILED", "REJECTED"]),
    error: zod_1.z.string().optional(),
    executedAt: zod_1.z.string().datetime(),
});
