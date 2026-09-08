import { FastifyInstance } from "fastify";
import { z } from "zod";
import { GameCommandType, CommandPriority } from "@live/shared";
import { requireDashboardAuth } from "../security/auth";
import { buildAndEnqueueCommand } from "../commands/commandService";
import { commandHandlers } from "../commands/CommandHandler";
import { commandLogRepository } from "../db";

const TestCommandSchema = z.object({
  type: GameCommandType,
  params: z.record(z.unknown()).default({}),
  priority: CommandPriority.default("HIGH"),
});

export async function commandRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireDashboardAuth);

  app.get("/api/commands", async () =>
    commandHandlers.map((h) => ({
      type: h.type,
      defaultCooldownSeconds: h.defaultCooldownSeconds,
    }))
  );

  app.post("/api/commands/test", async (req, reply) => {
    const parsed = TestCommandSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    try {
      const command = buildAndEnqueueCommand(parsed.data);
      return reply.code(201).send(command);
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });

  app.get("/api/logs", async (req) => {
    const query = req.query as { limit?: string };
    const limit = Math.min(500, Number(query.limit) || 100);
    return commandLogRepository.list(limit);
  });
}
