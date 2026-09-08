import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env";
import { logger } from "./logging/logger";
import { healthRoutes } from "./routes/health";
import { authRoutes } from "./routes/auth";
import { liveRoutes } from "./routes/live";
import { eventRoutes } from "./routes/events";
import { ruleRoutes } from "./routes/rules";
import { commandRoutes } from "./routes/commands";
import { simulatorRoutes } from "./routes/simulator";
import { robloxRoutes } from "./routes/roblox";
import { blockedUserRoutes } from "./routes/blockedUsers";
import { registerWebSocket } from "./ws/wsServer";

/** Builds a fully-wired Fastify instance without starting the listener — used by both server.ts and tests. */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false, trustProxy: true });

  await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true });
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute", allowList: [] });
  await registerWebSocket(app);

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(liveRoutes);
  await app.register(eventRoutes);
  await app.register(ruleRoutes);
  await app.register(commandRoutes);
  await app.register(simulatorRoutes);
  await app.register(robloxRoutes);
  await app.register(blockedUserRoutes);

  app.setErrorHandler((err, _req, reply) => {
    logger.error(err);
    reply.code(err.statusCode ?? 500).send({ error: err.message ?? "Internal server error" });
  });

  return app;
}
