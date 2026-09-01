import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";

export async function catalogRoutes(app: FastifyInstance) {
  const guard = { preHandler: [authenticate, authorize("catalog", "read")] };

  // Products with photos + prices (virtual catalog).
  app.get("/catalog-items", guard, async (request) => {
    const products = await prisma.product.findMany({
      where: { businessId: request.user!.businessId, active: true },
      include: { variants: true, category: true },
      orderBy: { name: "asc" },
    });

    return products
      .filter((p) => p.imageUrl)
      .map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        imageUrl: p.imageUrl,
        priceCents: p.priceCents,
        categoryName: p.category?.name ?? null,
      }));
  });
}
