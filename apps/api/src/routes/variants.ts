import type { FastifyInstance } from "fastify";
import { variantInputSchema } from "@dnd/shared";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { notFound } from "../lib/errors.js";

/** Variant CRUD — each variant carries independent stock (spec: inventory/variants). */
export async function variantRoutes(app: FastifyInstance) {
  app.get(
    "/variants",
    { preHandler: [authenticate, authorize("inventory", "read")] },
    async (request) => {
      const { productId } = request.query as { productId?: string };
      return prisma.variant.findMany({
        where: { productId },
        include: { product: { select: { id: true, businessId: true } } },
      });
    },
  );

  app.post(
    "/variants",
    { preHandler: [authenticate, authorize("inventory", "create")] },
    async (request, reply) => {
      const input = variantInputSchema.parse(request.body);
      const { productId } = request.body as { productId: string };
      if (!productId) throw notFound("productId required");

      const variant = await prisma.variant.create({
        data: {
          productId,
          sku: input.sku ?? null,
          barcode: input.barcode ?? null,
          priceCents: input.priceCents,
          costCents: input.costCents,
          stock: input.stock,
        },
      });
      return reply.code(201).send(variant);
    },
  );

  app.put(
    "/variants/:id",
    { preHandler: [authenticate, authorize("inventory", "update")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const input = variantInputSchema.parse(request.body);
      const existing = await prisma.variant.findUnique({ where: { id } });
      if (!existing) throw notFound("Variant not found");
      return prisma.variant.update({
        where: { id },
        data: {
          sku: input.sku ?? null,
          barcode: input.barcode ?? null,
          priceCents: input.priceCents,
          costCents: input.costCents,
          stock: input.stock,
        },
      });
    },
  );

  app.delete(
    "/variants/:id",
    { preHandler: [authenticate, authorize("inventory", "delete")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const existing = await prisma.variant.findUnique({ where: { id } });
      if (!existing) throw notFound("Variant not found");
      await prisma.variant.update({ where: { id }, data: { active: false } });
      return { ok: true };
    },
  );
}
