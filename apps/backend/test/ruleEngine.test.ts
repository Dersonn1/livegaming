import { describe, it, expect, beforeEach } from "vitest";
import { RuleEngine } from "../src/rules/ruleEngine";
import { CooldownManager } from "../src/rules/cooldownManager";
import { normalizeEvent } from "../src/events/normalizer";
import { Rule } from "@live/shared";

function makeRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: "rule-1",
    name: "test rule",
    enabled: true,
    eventType: "GIFT",
    conditions: [],
    action: { command: "SPAWN_ENEMY", params: { amount: 1 }, priority: "NORMAL" },
    cooldownSeconds: 0,
    cooldownStrategy: "IGNORE",
    priority: 0,
    ...overrides,
  };
}

describe("RuleEngine", () => {
  let engine: RuleEngine;

  beforeEach(() => {
    engine = new RuleEngine(new CooldownManager());
  });

  it("matches gift 'rose' -> spawn enemy", () => {
    const rule = makeRule({
      conditions: [{ field: "giftName", op: "eq", value: "rose" }],
    });
    const event = normalizeEvent({
      provider: "SIMULATOR",
      type: "GIFT",
      userId: "u1",
      username: "joao",
      metadata: { giftName: "rose" },
    });

    const matches = engine.evaluate(event, [rule]);
    expect(matches).toHaveLength(1);
    expect(matches[0].action.command).toBe("SPAWN_ENEMY");
  });

  it("does not match when gift name differs", () => {
    const rule = makeRule({ conditions: [{ field: "giftName", op: "eq", value: "rose" }] });
    const event = normalizeEvent({
      provider: "SIMULATOR",
      type: "GIFT",
      userId: "u1",
      username: "joao",
      metadata: { giftName: "diamond" },
    });
    expect(engine.evaluate(event, [rule])).toHaveLength(0);
  });

  it("matches 100 likes -> spawn boss via likesTotal condition", () => {
    const rule = makeRule({
      eventType: "LIKE_MILESTONE",
      conditions: [{ field: "likesTotal", op: "gte", value: 100 }],
      action: { command: "SPAWN_BOSS", params: {}, priority: "HIGH" },
    });
    const event = normalizeEvent({
      provider: "SIMULATOR",
      type: "LIKE_MILESTONE",
      userId: "u1",
      username: "maria",
      amount: 100,
      metadata: { totalLikes: 100 },
    });
    const matches = engine.evaluate(event, [rule]);
    expect(matches).toHaveLength(1);
    expect(matches[0].action.command).toBe("SPAWN_BOSS");
  });

  it("matches comment containing !meteor", () => {
    const rule = makeRule({
      eventType: "COMMENT",
      conditions: [{ field: "commentContains", op: "eq", value: "!meteor" }],
      action: { command: "SPAWN_METEOR", params: {}, priority: "HIGH" },
    });
    const event = normalizeEvent({
      provider: "SIMULATOR",
      type: "COMMENT",
      userId: "u1",
      username: "maria",
      message: "let's go !meteor now",
    });
    expect(engine.evaluate(event, [rule])).toHaveLength(1);
  });

  it("ignores disabled rules", () => {
    const rule = makeRule({ enabled: false });
    const event = normalizeEvent({ provider: "SIMULATOR", type: "GIFT", userId: "u1", username: "joao" });
    expect(engine.evaluate(event, [rule])).toHaveLength(0);
  });

  it("applies cooldown: second event within cooldown window is suppressed", () => {
    const cooldown = new CooldownManager();
    engine = new RuleEngine(cooldown);
    const rule = makeRule({ cooldownSeconds: 30, cooldownStrategy: "IGNORE" });
    const event = normalizeEvent({ provider: "SIMULATOR", type: "GIFT", userId: "u1", username: "joao" });

    expect(engine.evaluate(event, [rule])).toHaveLength(1);
    expect(engine.evaluate(event, [rule])).toHaveLength(0);
  });
});
