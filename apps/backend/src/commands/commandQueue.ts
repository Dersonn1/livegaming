import { GameCommand, CommandPriority } from "@live/shared";

const PRIORITY_WEIGHT: Record<CommandPriority, number> = { HIGH: 0, NORMAL: 1, LOW: 2 };

interface QueuedCommand {
  command: GameCommand;
  status: "PENDING" | "DELIVERED" | "ACKED";
}

/**
 * In-memory priority queue of GameCommands awaiting delivery to Roblox.
 * Roblox drains it via GET /api/roblox/commands (long-poll style) and
 * confirms via POST /api/roblox/ack. Expired commands are dropped rather
 * than delivered, per the anti-replay requirements in docs/SECURITY.md.
 */
export class CommandQueue {
  private queue: QueuedCommand[] = [];
  private readonly maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  enqueue(command: GameCommand): void {
    if (this.queue.length >= this.maxSize) {
      // Drop the lowest-priority, oldest pending command to make room.
      const dropIndex = [...this.queue].reverse().findIndex((q) => q.status === "PENDING");
      if (dropIndex >= 0) this.queue.splice(this.queue.length - 1 - dropIndex, 1);
    }
    this.queue.push({ command, status: "PENDING" });
  }

  /** Pulls up to `limit` pending, non-expired commands, marking them DELIVERED. */
  dequeueBatch(limit: number): GameCommand[] {
    const now = Date.now();
    this.queue = this.queue.filter((q) => {
      if (q.status !== "PENDING") return true;
      return new Date(q.command.expiresAt).getTime() > now;
    });

    const pending = this.queue
      .filter((q) => q.status === "PENDING")
      .sort((a, b) => PRIORITY_WEIGHT[a.command.priority] - PRIORITY_WEIGHT[b.command.priority]);

    const batch = pending.slice(0, limit);
    for (const item of batch) item.status = "DELIVERED";
    return batch.map((q) => q.command);
  }

  ack(commandId: string): void {
    const item = this.queue.find((q) => q.command.id === commandId);
    if (item) item.status = "ACKED";
    this.queue = this.queue.filter((q) => q.status !== "ACKED");
  }

  size(): number {
    return this.queue.filter((q) => q.status === "PENDING").length;
  }
}

export const commandQueue = new CommandQueue();
