import type { FastifyInstance } from "fastify";
import { closeCashSessionSchema, openCashSessionSchema } from "@dnd/shared";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { closeSession, findOpenSession, openSession } from "../services/cashService.js";
import { badRequest } from "../lib/errors.js";

export async function cashSessionRoutes(app: FastifyInstance) {
  const read = { preHandler: [authenticate, authorize("pos", "read")] };
  const write = { preHandler: [authenticate, authorize("pos", "create")] };

  app.get("/cash-sessions/current", read, async (request) => {
    const user = request.user!;
    if (!user.branchId) return { session: null };
    const session = await findOpenSession(user.branchId);
    return { session };
  });

  app.post("/cash-sessions/open", write, async (request, reply) => {
    const user = request.user!;
    const input = openCashSessionSchema.parse(request.body);
    if (!user.branchId) throw badRequest("User has no branch");
    const session = await openSession(input.openingCents, {
      businessId: user.businessId,
      branchId: user.branchId,
      userId: user.id,
    });
    return reply.code(201).send(session);
  });

  app.post(
    "/cash-sessions/:id/close",
    { preHandler: [authenticate, authorize("pos", "update")] },
    async (request) => {
      const user = request.user!;
      const { id } = request.params as { id: string };
      const input = closeCashSessionSchema.parse(request.body);
      try {
        const result = await closeSession(id, input.countedCents, {
          businessId: user.businessId,
          branchId: user.branchId ?? "",
          userId: user.id,
        });
        return result;
      } catch (err) {
        throw badRequest(err instanceof Error ? err.message : "Close failed");
      }
    },
  );

  app.get("/cash-sessions", read, async (request) => {
    const user = request.user!;
    return prisma.cashSession.findMany({
      where: user.branchId ? { branchId: user.branchId } : {},
      include: { user: { select: { name: true } } },
      orderBy: { openedAt: "desc" },
      take: 50,
    });
  });
}
