import { prisma } from "../lib/prisma.js";
import { emit } from "../lib/socket.js";

export interface AbonoContext {
  userId: string;
  businessId: string;
  branchId: string | null;
}

/**
 * Apply an abono (partial payment) to a debt, reducing remainingCents.
 * Records the Abono row (audit) and rejects over-payment.
 */
export async function applyAbono(debtId: string, amountCents: number, ctx: AbonoContext) {
  return prisma.$transaction(async (tx) => {
    const debt = await tx.debt.findUnique({ where: { id: debtId } });
    if (!debt) throw new Error("Debt not found");
    if (Number(debt.remainingCents) < amountCents) {
      throw new Error(`Abono exceeds remaining debt (${debt.remainingCents} < ${amountCents})`);
    }

    const abono = await tx.abono.create({
      data: {
        debtId,
        amountCents,
        userId: ctx.userId,
      },
    });

    const updated = await tx.debt.update({
      where: { id: debtId },
      data: { remainingCents: { decrement: amountCents } },
    });

    emit("fiado.paid", { debtId, amountCents }, ctx.branchId ?? undefined, ctx.businessId);

    return { abono, remainingCents: Number(updated.remainingCents) };
  });
}

/** List overdue debts (remaining > 0 and dueAt in the past). */
export async function listOverdueDebts(businessId: string) {
  const now = new Date();
  return prisma.debt.findMany({
    where: {
      businessId,
      remainingCents: { gt: 0 },
      dueAt: { lt: now },
    },
    include: { customer: true },
    orderBy: { dueAt: "asc" },
  });
}
