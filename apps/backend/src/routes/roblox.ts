import { FastifyInstance } from "fastify";
import { z } from "zod";
import { CommandAckSchema } from "@live/shared";
import { randomUUID } from "node:crypto";
import { requireDashboardAuth, requireRobloxApiKey, hashApiKey } from "../security/auth";
import { robloxGateway } from "../roblox/robloxGateway";
import { gameConnectionRepository } from "../db";

const RegisterSchema = z.object({ name: z.string().min(1), placeId: z.string().optional() });

export async function robloxRoutes(app: FastifyInstance): Promise<void> {
  // Dashboard-operated: create a new API key for a Roblox game connection.
  app.post("/api/roblox/register", { preHandler: requireDashboardAuth }, async (req, reply) => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const apiKey = `rbx_${randomUUID().replace(/-/g, "")}`;
    await gameConnectionRepository.register(parsed.data.name, hashApiKey(apiKey), parsed.data.placeId);

    return reply.code(201).send({
      apiKey,
      warning: "Store this key now — it will not be shown again. Put it in the Roblox script's GameConfig, never client-side.",
    });
  });

  app.get("/api/roblox/status", { preHandler: requireDashboardAuth }, async () => robloxGateway.getStatus());

  // Roblox-facing: polled by ServerScriptService/Services/CommandService.lua via HttpService.
  app.get("/api/roblox/commands", { preHandler: requireRobloxApiKey }, async () => robloxGateway.pollCommands());

  app.post("/api/roblox/ack", { preHandler: requireRobloxApiKey }, async (req, reply) => {
    const parsed = CommandAckSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const result = robloxGateway.ack(parsed.data);
    return result;
  });
}
