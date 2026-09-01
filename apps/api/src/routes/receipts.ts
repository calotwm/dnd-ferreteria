import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { notFound } from "../lib/errors.js";

export async function receiptRoutes(app: FastifyInstance) {
  const guard = { preHandler: [authenticate, authorize("receipts", "read")] };

  app.get("/receipts/:id", guard, async (request) => {
    const { id } = request.params as { id: string };
    const receipt = await prisma.receipt.findFirst({
      where: { id },
      include: {
        sale: {
          include: {
            items: { include: { variant: { include: { product: true } } } },
            payments: true,
            customer: true,
            seller: true,
            branch: true,
          },
        },
      },
    });
    if (!receipt) throw notFound("Receipt not found");

    const sale = receipt.sale;
    return {
      id: receipt.id,
      number: receipt.number,
      totalCents: receipt.totalCents,
      createdAt: receipt.createdAt,
      branchName: sale.branch.name,
      sellerName: sale.seller.name,
      customerName: sale.customer?.name ?? null,
      paymentMethod: sale.payments[0]?.method ?? null,
      items: sale.items.map((i) => ({
        name: i.variant.product.name,
        qty: i.qty,
        unitPriceCents: i.unitPriceCents,
      })),
      discountCents: sale.discountCents,
    };
  });
}
