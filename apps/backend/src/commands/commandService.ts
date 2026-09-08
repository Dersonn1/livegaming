import { randomUUID } from "node:crypto";
import { GameCommand, LiveEvent } from "@live/shared";
import { commandHandlerRegistry } from "./CommandHandler";
import { MatchedAction } from "../rules/ruleEngine";
import { commandQueue } from "./commandQueue";
import { env } from "../config/env";
import { commandLogRepository } from "../db";
import { logCommand } from "../logging/logger";
import { publishCommandLog } from "../events/eventBus";

export interface CommandTestRequest {
  type: GameCommand["type"];
  params?: Record<string, unknown>;
  priority?: GameCommand["priority"];
}

/**
 * Turns a matched rule action (or a manual "test a command" request from the
 * dashboard) into a validated, signed-later GameCommand and pushes it onto
 * the CommandQueue. This is the single choke point all commands pass
 * through — handlers guarantee payload shape, so nothing malformed reaches
 * Roblox.
 */
export function buildAndEnqueueCommand(
  request: CommandTestRequest,
  context: { sourceEvent?: LiveEvent; multiplier?: number } = {}
): GameCommand {
  const handler = commandHandlerRegistry.get(request.type);
  if (!handler) throw new Error(`Unknown command type: ${request.type}`);

  const payload = handler.buildPayload(request.params ?? {}, context.multiplier ?? 1);
  handler.payloadSchema.parse(payload);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.COMMAND_EXPIRY_SECONDS * 1000);

  const command: GameCommand = {
    id: randomUUID(),
    type: request.type,
    payload,
    priority: request.priority ?? "NORMAL",
    timestamp: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    sourceEventId: context.sourceEvent?.id,
    nonce: randomUUID(),
  };

  commandQueue.enqueue(command);

  const logEntry = {
    id: randomUUID(),
    createdAt: now.toISOString(),
    commandId: command.id,
    eventId: context.sourceEvent?.id,
    provider: context.sourceEvent?.provider,
    username: context.sourceEvent?.username,
    action: command.type,
    status: "QUEUED" as const,
  };
  void commandLogRepository.save(logEntry);
  logCommand(logEntry);
  publishCommandLog(logEntry);

  return command;
}

export function processMatchedActions(event: LiveEvent, matches: MatchedAction[]): GameCommand[] {
  return matches.map((m) =>
    buildAndEnqueueCommand(
      { type: m.action.command, params: m.action.params, priority: m.action.priority },
      { sourceEvent: event, multiplier: m.multiplier }
    )
  );
}
