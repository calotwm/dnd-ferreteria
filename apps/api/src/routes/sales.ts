import type { FastifyInstance } from "fastify";
import { createSaleSchema } from "@dnd/shared";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { createSale } from "../services/saleService.js";
import { badRequest } from "../lib/errors.js";

export async function saleRoutes(app: FastifyInstance) {
  const read = { preHandler: [authenticate, authorize("receipts", "read")] };
  const write = { preHandler: [authenticate, authorize("pos", "create")] };

  // Create a sale (atomic stock deduction).
  app.post("/sales", write, async (request, reply) => {
    const user = request.user!;
    const input = createSaleSchema.parse(request.body);

    try {
      const result = await createSale(
        {
          items: input.items.map((i) => ({
            variantId: i.variantId,
            qty: i.qty,
            unitPriceCents: i.unitPriceCents,
          })),
          paymentMethod: input.payment.method,
          amountCents: input.payment.amountCents,
          discount: input.discount ?? null,
          customerId: input.customerId ?? null,
        },
        { businessId: user.businessId, branchId: user.branchId ?? "", sellerId: user.id },
      );

      return reply.code(201).send({
        id: result.sale.id,
        totalCents: result.totalCents,
        discountCents: result.discountCents,
        customerId: result.sale.customerId,
        createdAt: result.sale.createdAt,
        receiptId: result.receipt.id,
        debtId: result.debtId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sale failed";
      throw badRequest(message);
    }
  });

  // List sales for receipts/history (branch-scoped).
  app.get("/sales", read, async (request) => {
    const user = request.user!;
    const { limit, cursor } = request.query as { limit?: string; cursor?: string };
    const sales = await prisma.sale.findMany({
      where: {
        businessId: user.businessId,
        ...(user.branchId ? { branchId: user.branchId } : {}),
      },
      take: Number(limit ?? 50),
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        items: { include: { variant: { include: { product: true } } } },
        payments: true,
        customer: true,
        receipts: true,
      },
    });

    return sales.map((s) => ({
      id: s.id,
      totalCents: s.totalCents,
      discountCents: s.discountCents,
      createdAt: s.createdAt,
      customer: s.customer ? { id: s.customer.id, name: s.customer.name } : null,
      items: s.items.map((i) => ({
        productName: i.variant.product.name,
        qty: i.qty,
        unitPriceCents: i.unitPriceCents,
      })),
      payment: s.payments[0] ? { method: s.payments[0].method, amountCents: s.payments[0].amountCents } : null,
      receipt: s.receipts[0] ? { id: s.receipts[0].id, number: s.receipts[0].number } : null,
    }));
  });

  app.get("/sales/:id", read, async (request) => {
    const { id } = request.params as { id: string };
    const sale = await prisma.sale.findFirst({
      where: { id, businessId: request.user!.businessId },
      include: {
        items: { include: { variant: { include: { product: true } } } },
        payments: true,
        customer: true,
        receipts: true,
      },
    });
    if (!sale) throw badRequest("Sale not found");
    return {
      id: sale.id,
      totalCents: sale.totalCents,
      discountCents: sale.discountCents,
      createdAt: sale.createdAt,
      customer: sale.customer ? { id: sale.customer.id, name: sale.customer.name } : null,
      items: sale.items.map((i) => ({
        productName: i.variant.product.name,
        qty: i.qty,
        unitPriceCents: i.unitPriceCents,
      })),
      payment: sale.payments[0] ? { method: sale.payments[0].method, amountCents: sale.payments[0].amountCents } : null,
      receipt: sale.receipts[0] ? { id: sale.receipts[0].id, number: sale.receipts[0].number } : null,
    };
  });
}
