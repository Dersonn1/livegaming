import { EventEmitter } from "node:events";
import type { LiveEvent } from "@live/shared";
import type { CommandLogEntry } from "../logging/logger";

/**
 * Central in-process pub/sub. A single backend instance is assumed for the
 * MVP; if horizontal scaling is needed later, swap this for a Redis
 * pub/sub-backed implementation behind the same interface (REDIS_URL is
 * already part of the config for that purpose).
 */
class EventBus extends EventEmitter {}

export const eventBus = new EventBus();
eventBus.setMaxListeners(50);

export const EVENT_RECEIVED = "event:received";
export const COMMAND_LOG = "command:log";

export function publishLiveEvent(event: LiveEvent): void {
  eventBus.emit(EVENT_RECEIVED, event);
}

export function publishCommandLog(entry: CommandLogEntry): void {
  eventBus.emit(COMMAND_LOG, entry);
}
