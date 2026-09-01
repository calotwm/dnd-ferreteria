import type { FastifyInstance } from "fastify";
import { productInputSchema, productSearchSchema } from "@dnd/shared";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { notFound } from "../lib/errors.js";
import { buildInventoryExportXlsx } from "../services/inventoryExport.js";
import type { AuthUser } from "../middleware/auth.js";

export interface ProductWithVariants {
  id: string;
  name: string;
  barcode: string | null;
  description: string | null;
  costCents: bigint;
  priceCents: bigint;
  active: boolean;
  imageUrl: string | null;
  categoryId: string | null;
  category: { name: string } | null;
  variants: Array<{ id: string; sku: string | null; barcode: string | null; priceCents: bigint; costCents: bigint; stock: number }>;
}

function serializeProduct(p: ProductWithVariants) {
  return {
    id: p.id,
    name: p.name,
    barcode: p.barcode,
    description: p.description,
    costCents: p.costCents,
    priceCents: p.priceCents,
    active: p.active,
    imageUrl: p.imageUrl,
    categoryId: p.categoryId,
    categoryName: p.category?.name ?? null,
    stock: p.variants.reduce((sum, v) => sum + v.stock, 0),
    variants: p.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      barcode: v.barcode,
      priceCents: v.priceCents,
      costCents: v.costCents,
      stock: v.stock,
    })),
  };
}

const includeVariants = {
  category: true,
  variants: { where: { active: true }, orderBy: { createdAt: "asc" as const } },
};

export async function productRoutes(app: FastifyInstance) {
  const read = { preHandler: [authenticate, authorize("inventory", "read")] };
  const create = { preHandler: [authenticate, authorize("inventory", "create")] };
  const update = { preHandler: [authenticate, authorize("inventory", "update")] };
  const del = { preHandler: [authenticate, authorize("inventory", "delete")] };

  app.get("/products", read, async (request) => {
    const user = request.user!;
    const { limit, cursor } = request.query as { limit?: string; cursor?: string };
    const products = await prisma.product.findMany({
      where: { businessId: user.businessId },
      take: Number(limit ?? 50),
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { name: "asc" },
      include: includeVariants,
    });
    return products.map(serializeProduct);
  });

  // POS search: by name or barcode (product or variant).
  app.get(
    "/products/search",
    { preHandler: [authenticate, authorize("pos", "read")] },
    async (request) => {
      const user = request.user!;
      const { q, limit } = productSearchSchema.parse(request.query);
      const products = await prisma.product.findMany({
        where: {
          businessId: user.businessId,
          active: true,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { barcode: { contains: q } },
            { variants: { some: { barcode: { contains: q } } } },
          ],
        },
        take: limit,
        include: includeVariants,
      });
      return products.map(serializeProduct);
    },
  );

  app.get("/products/:id", read, async (request) => {
    const { id } = request.params as { id: string };
    const product = await prisma.product.findFirst({
      where: { id, businessId: request.user!.businessId },
      include: includeVariants,
    });
    if (!product) throw notFound("Product not found");
    return serializeProduct(product);
  });

  // Inventory Excel export (Spanish headers, currency-safe values) — mirrors
  // /stats/export. Requires inventory read permission.
  app.get("/inventory/export", read, async (request, reply) => {
    const user = request.user!;
    const products = await prisma.product.findMany({
      where: { businessId: user.businessId },
      include: includeVariants,
      orderBy: { name: "asc" },
    });

    const items = products.map((p) => ({
      name: p.name,
      barcode: p.barcode,
      categoryName: p.category?.name ?? null,
      costCents: p.costCents,
      priceCents: p.priceCents,
      stock: p.variants.reduce((sum, v) => sum + v.stock, 0),
    }));

    const buf = buildInventoryExportXlsx(items);

    return reply
      .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      .header("Content-Disposition", 'attachment; filename="inventario.xlsx"')
      .send(buf);
  });

  app.post("/products", create, async (request, reply) => {
    const user = request.user!;
    const input = productInputSchema.parse(request.body);

    const variants = input.variants && input.variants.length > 0
      ? input.variants
      : [
          {
            sku: null,
            barcode: input.barcode ?? null,
            priceCents: input.priceCents,
            costCents: input.costCents,
            stock: 0,
          },
        ];

    const product = await prisma.product.create({
      data: {
        businessId: user.businessId,
        categoryId: input.categoryId ?? null,
        name: input.name,
        barcode: input.barcode ?? null,
        description: input.description ?? null,
        costCents: input.costCents,
        priceCents: input.priceCents,
        imageUrl: input.imageUrl || null,
        variants: {
          create: variants.map((v) => ({
            sku: v.sku ?? null,
            barcode: v.barcode ?? null,
            priceCents: v.priceCents,
            costCents: v.costCents,
            stock: v.stock,
          })),
        },
      },
      include: includeVariants,
    });

    return reply.code(201).send(serializeProduct(product));
  });

  app.put("/products/:id", update, async (request) => {
    const { id } = request.params as { id: string };
    const user = request.user!;
    const input = productInputSchema.parse(request.body);

    const existing = await prisma.product.findFirst({ where: { id, businessId: user.businessId } });
    if (!existing) throw notFound("Product not found");

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: input.name,
        barcode: input.barcode ?? null,
        description: input.description ?? null,
        costCents: input.costCents,
        priceCents: input.priceCents,
        categoryId: input.categoryId ?? null,
        imageUrl: input.imageUrl || null,
      },
      include: includeVariants,
    });

    return serializeProduct(product);
  });

  app.delete("/products/:id", del, async (request) => {
    const { id } = request.params as { id: string };
    const user = request.user!;
    const existing = await prisma.product.findFirst({ where: { id, businessId: user.businessId } });
    if (!existing) throw notFound("Product not found");
    // Soft-delete to preserve ledger references.
    await prisma.product.update({ where: { id }, data: { active: false } });
    return { ok: true };
  });
}
