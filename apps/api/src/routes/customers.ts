import type { FastifyInstance } from "fastify";
import { customerInputSchema } from "@dnd/shared";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { notFound } from "../lib/errors.js";

export async function customerRoutes(app: FastifyInstance) {
  const read = { preHandler: [authenticate, authorize("clients", "read")] };
  const write = { preHandler: [authenticate, authorize("clients", "create")] };

  app.get("/customers", read, async (request) => {
    return prisma.customer.findMany({
      where: { businessId: request.user!.businessId },
      orderBy: { name: "asc" },
    });
  });

  app.post("/customers", write, async (request, reply) => {
    const input = customerInputSchema.parse(request.body);
    const customer = await prisma.customer.create({
      data: {
        businessId: request.user!.businessId,
        name: input.name,
        phone: input.phone ?? null,
        email: input.email || null,
        notes: input.notes ?? null,
      },
    });
    return reply.code(201).send(customer);
  });

  app.put(
    "/customers/:id",
    { preHandler: [authenticate, authorize("clients", "update")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const input = customerInputSchema.parse(request.body);
      const existing = await prisma.customer.findFirst({
        where: { id, businessId: request.user!.businessId },
      });
      if (!existing) throw notFound("Customer not found");
      return prisma.customer.update({
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
    "/customers/:id",
    { preHandler: [authenticate, authorize("clients", "delete")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const existing = await prisma.customer.findFirst({
        where: { id, businessId: request.user!.businessId },
      });
      if (!existing) throw notFound("Customer not found");
      await prisma.customer.delete({ where: { id } });
      return { ok: true };
    },
  );

  // Purchase history for a client (spec: clients).
  app.get("/customers/:id/history", read, async (request) => {
    const { id } = request.params as { id: string };
    const customer = await prisma.customer.findFirst({
      where: { id, businessId: request.user!.businessId },
    });
    if (!customer) throw notFound("Customer not found");

    const [sales, debts] = await Promise.all([
      prisma.sale.findMany({
        where: { customerId: id },
        include: {
          items: { include: { variant: { include: { product: true } } } },
          payments: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.debt.findMany({
        where: { customerId: id },
        include: { abonos: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      customer,
      sales: sales.map((s) => ({
        id: s.id,
        totalCents: s.totalCents,
        createdAt: s.createdAt,
        items: s.items.map((i) => ({ name: i.variant.product.name, qty: i.qty })),
        method: s.payments[0]?.method ?? null,
      })),
      debts: debts.map((d) => ({
        id: d.id,
        totalCents: d.totalCents,
        remainingCents: d.remainingCents,
        dueAt: d.dueAt,
        createdAt: d.createdAt,
      })),
    };
  });
}
