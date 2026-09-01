import type { FastifyInstance } from "fastify";
import { categorySchema, paginationQuerySchema } from "@dnd/shared";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { notFound } from "../lib/errors.js";

export async function categoryRoutes(app: FastifyInstance) {
  const guard = { preHandler: [authenticate, authorize("inventory", "read")] };
  const writeGuard = { preHandler: [authenticate, authorize("inventory", "create")] };

  app.get("/categories", guard, async (request) => {
    const user = request.user!;
    const { limit, cursor } = paginationQuerySchema.parse(request.query);
    const categories = await prisma.category.findMany({
      where: { businessId: user.businessId },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { name: "asc" },
    });
    return categories;
  });

  app.post("/categories", writeGuard, async (request, reply) => {
    const input = categorySchema.parse(request.body);
    const category = await prisma.category.create({
      data: { businessId: request.user!.businessId, name: input.name },
    });
    return reply.code(201).send(category);
  });

  app.put(
    "/categories/:id",
    { preHandler: [authenticate, authorize("inventory", "update")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const input = categorySchema.parse(request.body);
      const existing = await prisma.category.findFirst({
        where: { id, businessId: request.user!.businessId },
      });
      if (!existing) throw notFound("Category not found");
      return prisma.category.update({ where: { id }, data: { name: input.name } });
    },
  );

  app.delete(
    "/categories/:id",
    { preHandler: [authenticate, authorize("inventory", "delete")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const existing = await prisma.category.findFirst({
        where: { id, businessId: request.user!.businessId },
      });
      if (!existing) throw notFound("Category not found");
      await prisma.category.delete({ where: { id } });
      return { ok: true };
    },
  );
}
