import { describe, it, expect } from "vitest";
import { commandHandlerRegistry } from "../src/commands/CommandHandler";
import { buildAndEnqueueCommand } from "../src/commands/commandService";

describe("CommandHandler registry", () => {
  it("has a handler for every documented command type", () => {
    const expectedTypes = [
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
    ];
    for (const type of expectedTypes) {
      expect(commandHandlerRegistry.has(type as any)).toBe(true);
    }
  });

  it("clamps out-of-range params instead of throwing", () => {
    const handler = commandHandlerRegistry.get("SPAWN_ENEMY")!;
    const payload = handler.buildPayload({ amount: 99999 }, 1);
    expect(payload.amount).toBeLessThanOrEqual(100);
  });
});

describe("buildAndEnqueueCommand", () => {
  it("throws on unknown command type", () => {
    expect(() => buildAndEnqueueCommand({ type: "NOT_A_REAL_COMMAND" as any })).toThrow();
  });

  it("produces a validated command with an expiry in the future", () => {
    const command = buildAndEnqueueCommand({ type: "SPAWN_BOSS", params: { amount: 1 } });
    expect(new Date(command.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(command.type).toBe("SPAWN_BOSS");
  });
});
