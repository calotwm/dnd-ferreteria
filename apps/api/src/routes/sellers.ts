import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";

export async function sellerRoutes(app: FastifyInstance) {
  app.get(
    "/sellers/performance",
    { preHandler: [authenticate, authorize("employees", "read")] },
    async (request) => {
      const user = request.user!;
      const sellers = await prisma.user.findMany({
        where: { businessId: user.businessId, active: true },
        select: { id: true, name: true, role: true },
      });

      const sales = await prisma.sale.groupBy({
        by: ["sellerId"],
        where: {
          businessId: user.businessId,
          ...(user.branchId ? { branchId: user.branchId } : {}),
        },
        _count: { _all: true },
        _sum: { totalCents: true },
      });

      const bySeller = new Map(sales.map((s) => [s.sellerId, s]));

      return sellers.map((s) => {
        const agg = bySeller.get(s.id);
        return {
          id: s.id,
          name: s.name,
          role: s.role,
          salesCount: agg?._count._all ?? 0,
          totalCents: agg?._sum.totalCents ?? 0,
        };
      });
    },
  );
}
