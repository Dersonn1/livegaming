import { RuleCreateInput } from "@live/shared";
import { ruleRepository } from "../db";
import { logger } from "../logging/logger";

/**
 * Seeds the three example rules from the project spec so the MVP works
 * end-to-end the moment the backend starts, with zero dashboard setup:
 *   GIFT "rose"        -> SPAWN_ENEMY x1
 *   100 likes reached  -> SPAWN_BOSS
 *   "!meteor" comment  -> SPAWN_METEOR
 * Only runs when no rules exist yet, so it never clobbers dashboard edits.
 */
export async function seedDefaultRules(): Promise<void> {
  const existing = await ruleRepository.list();
  if (existing.length > 0) return;

  const defaults: RuleCreateInput[] = [
    {
      name: "Gift Rose -> Spawn Enemy",
      enabled: true,
      eventType: "GIFT",
      conditions: [{ field: "giftName", op: "eq", value: "rose" }],
      action: { command: "SPAWN_ENEMY", params: { amount: 1 }, priority: "NORMAL" },
      cooldownSeconds: 0,
      cooldownStrategy: "IGNORE",
      priority: 10,
    },
    {
      name: "100 Likes -> Spawn Boss",
      enabled: true,
      eventType: "LIKE_MILESTONE",
      conditions: [{ field: "likesTotal", op: "gte", value: 100 }],
      action: { command: "SPAWN_BOSS", params: { amount: 1 }, priority: "HIGH" },
      cooldownSeconds: 60,
      cooldownStrategy: "IGNORE",
      priority: 20,
    },
    {
      name: "!meteor -> Meteor Shower",
      enabled: true,
      eventType: "COMMENT",
      conditions: [{ field: "commentContains", op: "eq", value: "!meteor" }],
      action: { command: "SPAWN_METEOR", params: { amount: 10, durationSeconds: 15 }, priority: "HIGH" },
      cooldownSeconds: 30,
      cooldownStrategy: "ACCUMULATE",
      priority: 15,
    },
  ];

  for (const rule of defaults) await ruleRepository.create(rule);
  logger.info(`Seeded ${defaults.length} default rules.`);
}
