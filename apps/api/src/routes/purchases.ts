import type { FastifyInstance } from "fastify";
import { purchaseInputSchema } from "@dnd/shared";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { createPurchase } from "../services/purchaseService.js";
import { badRequest } from "../lib/errors.js";

export async function purchaseRoutes(app: FastifyInstance) {
  const read = { preHandler: [authenticate, authorize("suppliers", "read")] };
  const write = { preHandler: [authenticate, authorize("expenses", "create")] };

  app.get("/purchases", read, async (request) => {
    return prisma.purchase.findMany({
      where: { businessId: request.user!.businessId },
      include: { supplier: true, items: { include: { variant: { include: { product: true } } } } },
      orderBy: { createdAt: "desc" },
    });
  });

  app.post("/purchases", write, async (request, reply) => {
    const user = request.user!;
    const input = purchaseInputSchema.parse(request.body);
    try {
      const purchase = await createPurchase(
        input.supplierId,
        input.items.map((i) => ({ variantId: i.variantId, qty: i.qty, costCents: i.costCents })),
        input.note ?? null,
        { businessId: user.businessId, userId: user.id, branchId: user.branchId ?? "" },
      );
      return reply.code(201).send(purchase);
    } catch (err) {
      throw badRequest(err instanceof Error ? err.message : "Purchase failed");
    }
  });
}
