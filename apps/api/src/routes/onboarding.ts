import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";

const putStepSchema = z.object({
  done: z.boolean().default(true),
});

export async function onboardingRoutes(app: FastifyInstance) {
  const guard = { preHandler: [authenticate, authorize("dashboard", "read")] };

  app.get("/onboarding", guard, async (request) => {
    const businessId = request.user!.businessId;
    const rows = await prisma.onboardingChecklist.findMany({ where: { businessId } });
    return rows.map((r) => ({ step: r.step, done: r.done }));
  });

  app.put(
    "/onboarding/:step",
    { preHandler: [authenticate, authorize("dashboard", "update")] },
    async (request) => {
      const { step } = request.params as { step: string };
      const input = putStepSchema.parse(request.body);
      const businessId = request.user!.businessId;
      const row = await prisma.onboardingChecklist.upsert({
        where: { businessId_step: { businessId, step } },
        create: { businessId, step, done: input.done },
        update: { done: input.done },
      });
      return { step: row.step, done: row.done };
    },
  );
}
