import { z } from "zod";
import { LiveEventType, LiveProviderName } from "./events";
import { GameCommandType, CommandPriority } from "./commands";

const numericOp = z.enum(["eq", "ne", "gt", "gte", "lt", "lte"]);

/** A single condition evaluated against a normalized LiveEvent. */
export const RuleConditionSchema = z.discriminatedUnion("field", [
  z.object({ field: z.literal("amount"), op: numericOp, value: z.number() }),
  z.object({ field: z.literal("giftName"), op: z.literal("eq"), value: z.string() }),
  z.object({ field: z.literal("username"), op: z.literal("eq"), value: z.string() }),
  z.object({
    field: z.literal("commentContains"),
    op: z.literal("eq"),
    value: z.string(),
  }),
  z.object({ field: z.literal("likesTotal"), op: numericOp, value: z.number() }),
]);
export type RuleCondition = z.infer<typeof RuleConditionSchema>;

export const RuleActionSchema = z.object({
  command: GameCommandType,
  params: z.record(z.unknown()).default({}),
  priority: CommandPriority.default("NORMAL"),
});
export type RuleAction = z.infer<typeof RuleActionSchema>;

export const CooldownStrategy = z.enum(["IGNORE", "ACCUMULATE", "ESCALATE"]);
export type CooldownStrategy = z.infer<typeof CooldownStrategy>;

export const RuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  enabled: z.boolean().default(true),
  provider: LiveProviderName.optional(), // undefined = any provider
  eventType: LiveEventType,
  conditions: z.array(RuleConditionSchema).default([]),
  action: RuleActionSchema,
  cooldownSeconds: z.number().int().nonnegative().default(0),
  cooldownStrategy: CooldownStrategy.default("IGNORE"),
  priority: z.number().int().default(0),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type Rule = z.infer<typeof RuleSchema>;

export const RuleCreateSchema = RuleSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type RuleCreateInput = z.infer<typeof RuleCreateSchema>;
