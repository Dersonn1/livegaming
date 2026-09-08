import { FastifyInstance } from "fastify";
import { z } from "zod";
import { LiveProviderName } from "@live/shared";
import { requireDashboardAuth } from "../security/auth";
import { connectProvider, disconnectProvider, getAllProviderStates } from "../providers/liveManager";

const ConnectSchema = z.object({ provider: LiveProviderName, channel: z.string().min(1) });
const DisconnectSchema = z.object({ provider: LiveProviderName });

export async function liveRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireDashboardAuth);

  app.get("/api/live/status", async () => getAllProviderStates());

  app.post("/api/live/connect", async (req, reply) => {
    const parsed = ConnectSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    try {
      await connectProvider(parsed.data.provider, parsed.data.channel);
      return { ok: true, state: getAllProviderStates()[parsed.data.provider] };
    } catch (err) {
      return reply.code(502).send({ error: (err as Error).message });
    }
  });

  app.post("/api/live/disconnect", async (req, reply) => {
    const parsed = DisconnectSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    await disconnectProvider(parsed.data.provider);
    return { ok: true };
  });
}
