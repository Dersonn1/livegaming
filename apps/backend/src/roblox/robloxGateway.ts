import { CommandAck, CommandBatchEnvelope } from "@live/shared";
import { commandQueue } from "../commands/commandQueue";
import { signPayload } from "./signing";
import { env } from "../config/env";
import { commandLogRepository } from "../db";
import { logCommand } from "../logging/logger";
import { publishCommandLog } from "../events/eventBus";
import { randomUUID } from "node:crypto";
import { Deduplicator } from "../events/aggregator";

export interface RobloxGatewayStatus {
  connected: boolean;
  lastPollAt: string | null;
  pendingCommands: number;
}

/**
 * Server-side half of the Roblox<->backend polling protocol (see
 * docs/ROBLOX.md for why polling, not push, is used). Roblox calls
 * pollCommands() periodically via HttpService and acks execution results.
 */
export class RobloxGateway {
  private lastPollAt: string | null = null;
  private ackDeduper = new Deduplicator(60_000);

  pollCommands(limit = env.ROBLOX_POLL_MAX_COMMANDS): CommandBatchEnvelope {
    this.lastPollAt = new Date().toISOString();
    const commands = commandQueue.dequeueBatch(limit);
    const body = { commands, issuedAt: this.lastPollAt };
    const signedPayload = JSON.stringify(body);
    const signature = signPayload(signedPayload);

    for (const command of commands) {
      const entry = {
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        commandId: command.id,
        action: command.type,
        status: "QUEUED" as const,
      };
      logCommand(entry);
    }

    return { ...body, signedPayload, signature };
  }

  ack(ack: CommandAck): { accepted: boolean; reason?: string } {
    const dedupeKey = `ack:${ack.commandId}`;
    if (this.ackDeduper.checkAndRecord(dedupeKey)) {
      return { accepted: false, reason: "Duplicate ack ignored." };
    }

    commandQueue.ack(ack.commandId);

    const entry = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      commandId: ack.commandId,
      action: "ACK",
      status: ack.status,
      latencyMs: undefined,
    };
    void commandLogRepository.save(entry as any);
    logCommand(entry as any);
    publishCommandLog(entry as any);

    return { accepted: true };
  }

  getStatus(): RobloxGatewayStatus {
    return {
      connected: this.lastPollAt !== null && Date.now() - new Date(this.lastPollAt).getTime() < 30_000,
      lastPollAt: this.lastPollAt,
      pendingCommands: commandQueue.size(),
    };
  }
}

export const robloxGateway = new RobloxGateway();
