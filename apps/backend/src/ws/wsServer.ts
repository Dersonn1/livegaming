import { FastifyInstance } from "fastify";
import websocketPlugin, { WebSocket } from "@fastify/websocket";
import { eventBus, EVENT_RECEIVED, COMMAND_LOG } from "../events/eventBus";
import { logger } from "../logging/logger";

/**
 * Real-time push to the dashboard: browsers get a normal WebSocket
 * connection to the backend (this direction IS fully supported, unlike
 * Roblox<->backend — see docs/ROBLOX.md). Every LiveEvent and command log
 * entry is fanned out to all connected dashboard clients as it happens.
 */
export async function registerWebSocket(app: FastifyInstance): Promise<void> {
  await app.register(websocketPlugin);

  const clients = new Set<WebSocket>();

  app.get("/ws", { websocket: true }, (socket) => {
    clients.add(socket);
    socket.send(JSON.stringify({ type: "connected" }));
    socket.on("close", () => clients.delete(socket));
    socket.on("error", (err) => logger.warn(err, "Dashboard WS client error"));
  });

  const broadcast = (message: unknown) => {
    const payload = JSON.stringify(message);
    for (const client of clients) {
      if (client.readyState === client.OPEN) client.send(payload);
    }
  };

  eventBus.on(EVENT_RECEIVED, (event) => broadcast({ type: "live_event", data: event }));
  eventBus.on(COMMAND_LOG, (entry) => broadcast({ type: "command_log", data: entry }));
}
