import type { FastifyInstance } from "fastify";
import * as XLSX from "xlsx";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { normalizeImportRows } from "../services/importService.js";
import { recordInventoryMovement, emitLowStockIfCrossed } from "../services/inventory.js";
import type { AuthUser } from "../middleware/auth.js";

const commitSchema = z.object({
  rows: z.array(z.record(z.unknown())).min(1),
});

/**
 * Upsert imported products. For each row, resolve the category (create if new),
 * find-or-create the product by barcode (fallback name), and add stock to its
 * default variant, recording an inventory movement for the delta.
 */
async function commitRows(user: AuthUser, rawRows: Array<Record<string, unknown>>) {
  const { rows, errors } = normalizeImportRows(rawRows);
  let imported = 0;

  for (const row of rows) {
    const barcode = row.codigo_barras || null;
    const stock = row.stock ?? 0;

    let categoryId: string | null = null;
    if (row.categoria) {
      let cat = await prisma.category.findFirst({
        where: { businessId: user.businessId, name: row.categoria },
      });
      if (!cat) {
        cat = await prisma.category.create({
          data: { businessId: user.businessId, name: row.categoria },
        });
      }
      categoryId = cat.id;
    }

    const productWhere = barcode
      ? { businessId: user.businessId, barcode }
      : { businessId: user.businessId, name: row.nombre, barcode: null };

    let product = await prisma.product.findFirst({ where: productWhere });

    if (product) {
      // Upsert: update prices + add stock to the default variant.
      await prisma.product.update({
        where: { id: product.id },
        data: { costCents: row.costo, priceCents: row.precio, categoryId },
      });
      const defaultVariant = await prisma.variant.findFirst({
        where: { productId: product.id },
        orderBy: { createdAt: "asc" },
      });
      if (defaultVariant) {
        const updated = await prisma.variant.update({
          where: { id: defaultVariant.id },
          data: { stock: { increment: stock }, barcode: barcode ?? defaultVariant.barcode },
        });
        // Defense-in-depth: imports only increment stock, so they never cross
        // below the threshold — kept uniform with sales/purchases (design).
        emitLowStockIfCrossed(
          updated.stock - stock,
          updated.stock,
          product.id,
          product.name,
          user.branchId ?? undefined,
          user.businessId,
        );
        if (stock > 0) {
          await recordInventoryMovement(prisma, {
            businessId: user.businessId,
            branchId: user.branchId ?? "",
            userId: user.id,
          }, {
            productId: product.id,
            variantId: defaultVariant.id,
            type: "ADJUSTMENT",
            qty: stock,
            reason: "Importación Excel",
          });
        }
      }
    } else {
      const created = await prisma.product.create({
        data: {
          businessId: user.businessId,
          name: row.nombre,
          barcode,
          costCents: row.costo,
          priceCents: row.precio,
          categoryId,
          variants: {
            create: [{ barcode, priceCents: row.precio, costCents: row.costo, stock }],
          },
        },
        include: { variants: true },
      });
      emitLowStockIfCrossed(
        0,
        stock,
        created.id,
        created.name,
        user.branchId ?? undefined,
        user.businessId,
      );
      if (stock > 0) {
        await recordInventoryMovement(prisma, {
          businessId: user.businessId,
          branchId: user.branchId ?? "",
          userId: user.id,
        }, {
          productId: created.id,
          variantId: created.variants[0]?.id ?? null,
          type: "ADJUSTMENT",
          qty: stock,
          reason: "Importación Excel",
        });
      }
    }
    imported++;
  }

  return { total: rawRows.length, imported, skipped: errors.length, errors };
}

export async function importRoutes(app: FastifyInstance) {
  const guard = { preHandler: [authenticate, authorize("inventory", "create")] };

  // Preview + validate without committing.
  app.post("/inventory/import/preview", guard, async (request) => {
    const data = await request.file();
    if (!data) throw new Error("No file provided");
    const buffer = await data.toBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
    const { rows, errors } = normalizeImportRows(raw);
    return {
      total: raw.length,
      imported: 0,
      skipped: errors.length,
      errors,
      preview: rows,
    };
  });

  // Commit validated rows (client sends the raw rows; server re-validates).
  app.post("/inventory/import/commit", guard, async (request) => {
    const { rows } = commitSchema.parse(request.body);
    return commitRows(request.user!, rows);
  });
}
