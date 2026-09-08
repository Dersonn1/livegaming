import pino from "pino";
import { env } from "../config/env";

export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : "info",
  transport:
    env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } }
      : undefined,
});

/** Structured event/command log entry, per docs/ARCHITECTURE.md observability section. */
export interface CommandLogEntry {
  eventId?: string;
  commandId: string;
  provider?: string;
  username?: string;
  action: string;
  status: "SUCCESS" | "FAILED" | "REJECTED" | "QUEUED";
  latencyMs?: number;
}

export function logCommand(entry: CommandLogEntry): void {
  logger.info({ type: "command_log", ...entry });
}
