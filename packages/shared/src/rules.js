"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleCreateSchema = exports.RuleSchema = exports.CooldownStrategy = exports.RuleActionSchema = exports.RuleConditionSchema = void 0;
const zod_1 = require("zod");
const events_1 = require("./events");
const commands_1 = require("./commands");
const numericOp = zod_1.z.enum(["eq", "ne", "gt", "gte", "lt", "lte"]);
/** A single condition evaluated against a normalized LiveEvent. */
exports.RuleConditionSchema = zod_1.z.discriminatedUnion("field", [
    zod_1.z.object({ field: zod_1.z.literal("amount"), op: numericOp, value: zod_1.z.number() }),
    zod_1.z.object({ field: zod_1.z.literal("giftName"), op: zod_1.z.literal("eq"), value: zod_1.z.string() }),
    zod_1.z.object({ field: zod_1.z.literal("username"), op: zod_1.z.literal("eq"), value: zod_1.z.string() }),
    zod_1.z.object({
        field: zod_1.z.literal("commentContains"),
        op: zod_1.z.literal("eq"),
        value: zod_1.z.string(),
    }),
    zod_1.z.object({ field: zod_1.z.literal("likesTotal"), op: numericOp, value: zod_1.z.number() }),
]);
exports.RuleActionSchema = zod_1.z.object({
    command: commands_1.GameCommandType,
    params: zod_1.z.record(zod_1.z.unknown()).default({}),
    priority: commands_1.CommandPriority.default("NORMAL"),
});
exports.CooldownStrategy = zod_1.z.enum(["IGNORE", "ACCUMULATE", "ESCALATE"]);
exports.RuleSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(200),
    enabled: zod_1.z.boolean().default(true),
    provider: events_1.LiveProviderName.optional(), // undefined = any provider
    eventType: events_1.LiveEventType,
    conditions: zod_1.z.array(exports.RuleConditionSchema).default([]),
    action: exports.RuleActionSchema,
    cooldownSeconds: zod_1.z.number().int().nonnegative().default(0),
    cooldownStrategy: exports.CooldownStrategy.default("IGNORE"),
    priority: zod_1.z.number().int().default(0),
    createdAt: zod_1.z.string().datetime().optional(),
    updatedAt: zod_1.z.string().datetime().optional(),
});
exports.RuleCreateSchema = exports.RuleSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
