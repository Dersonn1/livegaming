import { describe, it, expect, beforeEach } from "vitest";
import { processIncomingEvent } from "../src/pipeline";
import { normalizeEvent } from "../src/events/normalizer";
import { blockedUserRepository, ruleRepository } from "../src/db";

describe("processIncomingEvent (full pipeline)", () => {
  beforeEach(async () => {
    for (const rule of await ruleRepository.list()) await ruleRepository.remove(rule.id);
    for (const b of await blockedUserRepository.list()) await blockedUserRepository.unblock(b.userId, b.provider);
  });

  it("ignores events from a blocked user", async () => {
    await blockedUserRepository.block("blocked-1", "spammer", "SIMULATOR", "test");
    const event = normalizeEvent({ provider: "SIMULATOR", type: "GIFT", userId: "blocked-1", username: "spammer" });
    const result = await processIncomingEvent(event);
    expect(result.blocked).toBe(true);
    expect(result.commandsQueued).toBe(0);
  });

  it("queues a command when a matching rule exists", async () => {
    await ruleRepository.create({
      name: "gift -> enemy",
      enabled: true,
      eventType: "GIFT",
      conditions: [],
      action: { command: "SPAWN_ENEMY", params: { amount: 1 }, priority: "NORMAL" },
      cooldownSeconds: 0,
      cooldownStrategy: "IGNORE",
      priority: 0,
    });
    const event = normalizeEvent({ provider: "SIMULATOR", type: "GIFT", userId: "u1", username: "joao" });
    const result = await processIncomingEvent(event);
    expect(result.commandsQueued).toBe(1);
  });

  it("does not process an exact duplicate event a second time", async () => {
    const event = normalizeEvent({
      provider: "SIMULATOR",
      type: "COMMENT",
      userId: "dup-user",
      username: "x",
      message: "hello",
    });
    // Bypass id uniqueness by re-using the same normalized fields the
    // deduper actually keys on (provider+userId+type+message).
    const first = await processIncomingEvent(event);
    const second = await processIncomingEvent({ ...event, id: crypto.randomUUID() });
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
  });
});
