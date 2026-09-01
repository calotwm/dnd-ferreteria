import type { FastifyInstance } from "fastify";
import { abonoInputSchema } from "@dnd/shared";
import { applyAbono } from "../services/debtService.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { badRequest } from "../lib/errors.js";

export async function abonoRoutes(app: FastifyInstance) {
  app.post(
    "/debts/:id/abonos",
    { preHandler: [authenticate, authorize("clients", "create")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = abonoInputSchema.parse(request.body);
      const user = request.user!;
      try {
        const result = await applyAbono(id, input.amountCents, {
          userId: user.id,
          businessId: user.businessId,
          branchId: user.branchId,
        });
        return reply.code(201).send({
          abonoId: result.abono.id,
          amountCents: result.abono.amountCents,
          remainingCents: result.remainingCents,
        });
      } catch (err) {
        throw badRequest(err instanceof Error ? err.message : "Abono failed");
      }
    },
  );
}
