import { FastifyInstance } from "fastify";
import { RuleCreateSchema } from "@live/shared";
import { requireDashboardAuth } from "../security/auth";
import { ruleRepository } from "../db";
import { cooldownManager } from "../rules/cooldownManager";

export async function ruleRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireDashboardAuth);

  app.get("/api/rules", async () => ruleRepository.list());

  app.post("/api/rules", async (req, reply) => {
    const parsed = RuleCreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const rule = await ruleRepository.create(parsed.data);
    return reply.code(201).send(rule);
  });

  app.put("/api/rules/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = RuleCreateSchema.partial().safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const updated = await ruleRepository.update(id, parsed.data);
    if (!updated) return reply.code(404).send({ error: "Rule not found" });
    return updated;
  });

  app.delete("/api/rules/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const removed = await ruleRepository.remove(id);
    if (!removed) return reply.code(404).send({ error: "Rule not found" });
    cooldownManager.reset(id);
    return { ok: true };
  });
}
