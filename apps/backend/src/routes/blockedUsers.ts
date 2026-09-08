import { FastifyInstance } from "fastify";
import { z } from "zod";
import { LiveProviderName } from "@live/shared";
import { requireDashboardAuth } from "../security/auth";
import { blockedUserRepository } from "../db";

const BlockSchema = z.object({
  userId: z.string(),
  username: z.string(),
  provider: LiveProviderName,
  reason: z.string().optional(),
});

export async function blockedUserRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireDashboardAuth);

  app.get("/api/blocked-users", async () => blockedUserRepository.list());

  app.post("/api/blocked-users", async (req, reply) => {
    const parsed = BlockSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    await blockedUserRepository.block(parsed.data.userId, parsed.data.username, parsed.data.provider, parsed.data.reason);
    return reply.code(201).send({ ok: true });
  });

  app.delete("/api/blocked-users/:provider/:userId", async (req) => {
    const { provider, userId } = req.params as { provider: string; userId: string };
    await blockedUserRepository.unblock(userId, provider);
    return { ok: true };
  });
}
