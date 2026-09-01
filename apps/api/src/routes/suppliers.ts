import type { FastifyInstance } from "fastify";
import { supplierInputSchema } from "@dnd/shared";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { notFound } from "../lib/errors.js";

export async function supplierRoutes(app: FastifyInstance) {
  const read = { preHandler: [authenticate, authorize("suppliers", "read")] };
  const write = { preHandler: [authenticate, authorize("suppliers", "create")] };

  app.get("/suppliers", read, async (request) => {
    return prisma.supplier.findMany({
      where: { businessId: request.user!.businessId },
      orderBy: { name: "asc" },
    });
  });

  app.post("/suppliers", write, async (request, reply) => {
    const input = supplierInputSchema.parse(request.body);
    const supplier = await prisma.supplier.create({
      data: {
        businessId: request.user!.businessId,
        name: input.name,
        phone: input.phone ?? null,
        email: input.email || null,
        notes: input.notes ?? null,
      },
    });
    return reply.code(201).send(supplier);
  });

  app.put(
    "/suppliers/:id",
    { preHandler: [authenticate, authorize("suppliers", "update")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const input = supplierInputSchema.parse(request.body);
      const existing = await prisma.supplier.findFirst({
        where: { id, businessId: request.user!.businessId },
      });
      if (!existing) throw notFound("Supplier not found");
      return prisma.supplier.update({
        where: { id },
        data: {
          name: input.name,
          phone: input.phone ?? null,
          email: input.email || null,
          notes: input.notes ?? null,
        },
      });
    },
  );

  app.delete(
    "/suppliers/:id",
    { preHandler: [authenticate, authorize("suppliers", "delete")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const existing = await prisma.supplier.findFirst({
        where: { id, businessId: request.user!.businessId },
      });
      if (!existing) throw notFound("Supplier not found");
      await prisma.supplier.delete({ where: { id } });
      return { ok: true };
    },
  );
}
