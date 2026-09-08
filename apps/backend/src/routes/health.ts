import { FastifyInstance } from "fastify";
import { isPersistentStorageEnabled } from "../db/pool";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  app.get("/ready", async () => ({
    status: "ready",
    storage: isPersistentStorageEnabled() ? "postgres" : "in-memory",
  }));
}
