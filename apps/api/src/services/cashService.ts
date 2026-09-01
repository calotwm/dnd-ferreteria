import { prisma } from "../lib/prisma.js";
import { emit } from "../lib/socket.js";

export interface CashContext {
  userId: string;
  businessId: string;
  branchId: string;
}

/** Open a cash drawer for the shift, recording the opening amount. */
export async function openSession(openingCents: number, ctx: CashContext) {
  const session = await prisma.cashSession.create({
    data: {
      branchId: ctx.branchId,
      userId: ctx.userId,
      openingCents,
    },
  });

  await prisma.cashMovement.create({
    data: {
      sessionId: session.id,
      branchId: ctx.branchId,
      userId: ctx.userId,
      type: "OPEN",
      amountCents: openingCents,
    },
  });

  emit("cash.session", { sessionId: session.id, status: "open" }, ctx.branchId, ctx.businessId);
  return session;
}

/**
 * Close the cash drawer: compute expected cash from the movement ledger
 * (opening + cash sales - cash expenses) and compare against the counted amount,
 * flagging any difference (spec: employees/cash drawer).
 */
export async function closeSession(sessionId: string, countedCents: number, ctx: CashContext) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.cashSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error("Cash session not found");
    if (session.closedAt) throw new Error("Cash session already closed");

    const movements = await tx.cashMovement.findMany({ where: { sessionId } });
    const expectedCents = movements.reduce((sum, m) => {
      switch (m.type) {
        case "OPEN":
        case "SALE_IN":
        case "CASH_IN":
          return sum + Number(m.amountCents);
        case "CASH_OUT":
        case "EXPENSE_OUT":
          return sum - Number(m.amountCents);
        default:
          return sum;
      }
    }, 0);

    const differenceCents = countedCents - expectedCents;

    await tx.cashMovement.create({
      data: {
        sessionId,
        branchId: ctx.branchId,
        userId: ctx.userId,
        type: "CLOSE",
        amountCents: differenceCents,
      },
    });

    const closed = await tx.cashSession.update({
      where: { id: sessionId },
      data: {
        expectedCents,
        countedCents,
        differenceCents,
        closedAt: new Date(),
      },
    });

    emit("cash.session", { sessionId, status: "closed", differenceCents }, ctx.branchId, ctx.businessId);

    return { ...closed, expectedCents, differenceCents };
  });
}

/** Record an out-of-band cash movement (e.g. cash expense) on an open session. */
export async function recordCashOut(amountCents: number, ctx: CashContext, reason?: string) {
  const session = await prisma.cashSession.findFirst({
    where: { branchId: ctx.branchId, closedAt: null },
    orderBy: { openedAt: "desc" },
  });
  if (!session) throw new Error("No open cash session");

  return prisma.cashMovement.create({
    data: {
      sessionId: session.id,
      branchId: ctx.branchId,
      userId: ctx.userId,
      type: "CASH_OUT",
      amountCents,
    },
  });
}

/** Find the currently open session for a branch (or null). */
export async function findOpenSession(branchId: string) {
  return prisma.cashSession.findFirst({
    where: { branchId, closedAt: null },
    orderBy: { openedAt: "desc" },
  });
}
