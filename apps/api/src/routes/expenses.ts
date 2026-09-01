import type { FastifyInstance } from "fastify";
import { expenseInputSchema } from "@dnd/shared";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { recordCashOut } from "../services/cashService.js";

export async function expenseRoutes(app: FastifyInstance) {
  const read = { preHandler: [authenticate, authorize("expenses", "read")] };
  const write = { preHandler: [authenticate, authorize("expenses", "create")] };
  const del = { preHandler: [authenticate, authorize("expenses", "delete")] };

  app.get("/expenses", read, async (request) => {
    const user = request.user!;
    return prisma.expense.findMany({
      where: {
        businessId: user.businessId,
        ...(user.branchId ? { branchId: user.branchId } : {}),
      },
      include: { category: true },
      orderBy: { spentAt: "desc" },
    });
  });

  app.post("/expenses", write, async (request, reply) => {
    const user = request.user!;
    const input = expenseInputSchema.parse(request.body);
    const expense = await prisma.expense.create({
      data: {
        businessId: user.businessId,
        branchId: user.branchId ?? "",
        categoryId: input.categoryId,
        amountCents: input.amountCents,
        note: input.note ?? null,
        spentAt: input.spentAt ? new Date(input.spentAt) : new Date(),
      },
      include: { category: true },
    });

    // Cash expenses reduce the cash drawer (best-effort: only if an open session exists).
    try {
      await recordCashOut(input.amountCents, {
        businessId: user.businessId,
        branchId: user.branchId ?? "",
        userId: user.id,
      });
    } catch {
      // No open session — expense still recorded, drawer reconciled at close.
    }

    return reply.code(201).send(expense);
  });

  app.delete("/expenses/:id", del, async (request) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.expense.findFirst({
      where: { id, businessId: request.user!.businessId },
    });
    if (!existing) throw new Error("Expense not found");
    await prisma.expense.delete({ where: { id } });
    return { ok: true };
  });
}
