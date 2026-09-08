import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { CommandQueue } from "../src/commands/commandQueue";
import { GameCommand } from "@live/shared";

function makeCommand(overrides: Partial<GameCommand> = {}): GameCommand {
  const now = new Date();
  return {
    id: randomUUID(),
    type: "SPAWN_ENEMY",
    payload: { amount: 1 },
    priority: "NORMAL",
    timestamp: now.toISOString(),
    expiresAt: new Date(now.getTime() + 15_000).toISOString(),
    nonce: randomUUID(),
    ...overrides,
  };
}

describe("CommandQueue", () => {
  it("dequeues in priority order (HIGH before NORMAL before LOW)", () => {
    const queue = new CommandQueue();
    queue.enqueue(makeCommand({ priority: "LOW" }));
    queue.enqueue(makeCommand({ priority: "HIGH" }));
    queue.enqueue(makeCommand({ priority: "NORMAL" }));

    const batch = queue.dequeueBatch(10);
    expect(batch.map((c) => c.priority)).toEqual(["HIGH", "NORMAL", "LOW"]);
  });

  it("drops expired commands instead of delivering them", () => {
    const queue = new CommandQueue();
    queue.enqueue(makeCommand({ expiresAt: new Date(Date.now() - 1000).toISOString() }));
    const batch = queue.dequeueBatch(10);
    expect(batch).toHaveLength(0);
  });

  it("ack removes the command from the queue", () => {
    const queue = new CommandQueue();
    const cmd = makeCommand();
    queue.enqueue(cmd);
    queue.dequeueBatch(10);
    expect(queue.size()).toBe(0); // already DELIVERED, not counted as pending
    queue.ack(cmd.id);
    expect(queue.size()).toBe(0);
  });
});
