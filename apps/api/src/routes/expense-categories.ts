import type { FastifyInstance } from "fastify";
import { expenseCategoryInputSchema } from "@dnd/shared";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { notFound } from "../lib/errors.js";

export async function expenseCategoryRoutes(app: FastifyInstance) {
  const read = { preHandler: [authenticate, authorize("expenses", "read")] };
  const write = { preHandler: [authenticate, authorize("expenses", "create")] };

  app.get("/expense-categories", read, async (request) => {
    return prisma.expenseCategory.findMany({
      where: { businessId: request.user!.businessId },
      orderBy: { name: "asc" },
    });
  });

  app.post("/expense-categories", write, async (request, reply) => {
    const input = expenseCategoryInputSchema.parse(request.body);
    const category = await prisma.expenseCategory.create({
      data: { businessId: request.user!.businessId, name: input.name },
    });
    return reply.code(201).send(category);
  });

  app.delete(
    "/expense-categories/:id",
    { preHandler: [authenticate, authorize("expenses", "delete")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const existing = await prisma.expenseCategory.findFirst({
        where: { id, businessId: request.user!.businessId },
      });
      if (!existing) throw notFound("Category not found");
      await prisma.expenseCategory.delete({ where: { id } });
      return { ok: true };
    },
  );
}
