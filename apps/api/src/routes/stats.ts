import type { FastifyInstance } from "fastify";
import * as XLSX from "xlsx";
import { periodSchema } from "@dnd/shared";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { formatMoney } from "@dnd/shared";

function periodRange(period: "day" | "week" | "month"): { start: Date; prevStart: Date } {
  const now = new Date();
  let start = new Date(now);
  let prevStart = new Date(now);

  if (period === "day") {
    start.setHours(0, 0, 0, 0);
    prevStart.setDate(prevStart.getDate() - 1);
    prevStart.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    const day = (start.getDay() + 6) % 7; // Monday = 0
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 7);
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    prevStart = new Date(start);
    prevStart.setMonth(prevStart.getMonth() - 1);
  }

  return { start, prevStart };
}

async function salesAggregate(businessId: string, branchId: string | null, start: Date, end: Date) {
  const agg = await prisma.sale.aggregate({
    where: {
      businessId,
      ...(branchId ? { branchId } : {}),
      createdAt: { gte: start, lt: end },
    },
    _count: { _all: true },
    _sum: { totalCents: true },
  });
  return { count: agg._count._all, totalCents: agg._sum.totalCents ?? 0n };
}

export async function statsRoutes(app: FastifyInstance) {
  const guard = { preHandler: [authenticate, authorize("stats", "read")] };

  app.get("/stats/sales", guard, async (request) => {
    const user = request.user!;
    const { period } = request.query as { period?: string };
    const p = periodSchema.parse(period ?? "day");
    const { start, prevStart } = periodRange(p);
    const end = new Date();

    const current = await salesAggregate(user.businessId, user.branchId, start, end);
    const previous = await salesAggregate(user.businessId, user.branchId, prevStart, start);

    return {
      period: p,
      current: { ...current, totalCents: Number(current.totalCents) },
      previous: { ...previous, totalCents: Number(previous.totalCents) },
    };
  });

  app.get("/stats/top-products", guard, async (request) => {
    const user = request.user!;
    const items = await prisma.saleItem.findMany({
      where: {
        sale: {
          businessId: user.businessId,
          ...(user.branchId ? { branchId: user.branchId } : {}),
        },
      },
      include: { variant: { include: { product: true } } },
      orderBy: { qty: "desc" },
      take: 10,
    });

    const byProduct = new Map<string, { name: string; qty: number; revenue: bigint }>();
    for (const item of items) {
      const key = item.variant.product.id;
      const entry = byProduct.get(key) ?? { name: item.variant.product.name, qty: 0, revenue: 0n };
      entry.qty += item.qty;
      entry.revenue += BigInt(item.qty) * item.unitPriceCents;
      byProduct.set(key, entry);
    }

    return [...byProduct.entries()]
      .map(([id, v]) => ({ id, ...v, revenue: Number(v.revenue) }))
      .sort((a, b) => b.qty - a.qty);
  });

  app.get("/stats/cash-flow", guard, async (request) => {
    const user = request.user!;
    const { start, prevStart } = periodRange("month");
    const end = new Date();

    const [sales, expenses, previous] = await Promise.all([
      prisma.sale.aggregate({
        where: {
          businessId: user.businessId,
          ...(user.branchId ? { branchId: user.branchId } : {}),
          createdAt: { gte: start, lt: end },
        },
        _sum: { totalCents: true },
      }),
      prisma.expense.aggregate({
        where: {
          businessId: user.businessId,
          ...(user.branchId ? { branchId: user.branchId } : {}),
          spentAt: { gte: start, lt: end },
        },
        _sum: { amountCents: true },
      }),
      salesAggregate(user.businessId, user.branchId, prevStart, start),
    ]);

    const income = sales._sum.totalCents ?? 0n;
    const outgo = expenses._sum.amountCents ?? 0n;

    return {
      period: "month",
      income: Number(income),
      expenses: Number(outgo),
      net: Number(income - outgo),
      previousSales: Number(previous.totalCents),
    };
  });

  // Excel export (Spanish headers, currency-safe values).
  app.get("/stats/export", guard, async (request, reply) => {
    const user = request.user!;
    const { start } = periodRange("month");
    const sales = await prisma.sale.findMany({
      where: {
        businessId: user.businessId,
        ...(user.branchId ? { branchId: user.branchId } : {}),
        createdAt: { gte: start },
      },
      include: { payments: true, customer: true },
      orderBy: { createdAt: "desc" },
    });

    const rows = sales.map((s) => ({
      Fecha: s.createdAt.toISOString().slice(0, 10),
      Cliente: s.customer?.name ?? "—",
      "Método de pago": s.payments[0]?.method ?? "—",
      Total: formatMoney(s.totalCents, "ARS", "es-AR"),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventas");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return reply
      .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      .header("Content-Disposition", 'attachment; filename="ventas.xlsx"')
      .send(buf);
  });
}
