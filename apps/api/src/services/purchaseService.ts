import { prisma } from "../lib/prisma.js";
import { emit } from "../lib/socket.js";
import { emitLowStockIfCrossed } from "./inventory.js";

export interface PurchaseItemInput {
  variantId: string;
  qty: number;
  costCents: number;
}

export interface PurchaseContext {
  businessId: string;
  userId: string;
  branchId: string;
}

/**
 * Create a supplier purchase and auto-increase variant stock in one transaction,
 * recording an InventoryMovement per item (spec: expenses/purchase→stock).
 */
export async function createPurchase(
  supplierId: string,
  items: PurchaseItemInput[],
  note: string | null,
  ctx: PurchaseContext,
) {
  return prisma.$transaction(async (tx) => {
    let totalCents = 0;

    const purchase = await tx.purchase.create({
      data: {
        businessId: ctx.businessId,
        supplierId,
        totalCents: 0,
        note,
      },
    });

    for (const item of items) {
      totalCents += item.qty * item.costCents;

      const variant = await tx.variant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.qty } },
        include: { product: { select: { name: true } } },
      });

      await tx.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          productId: variant.productId,
          variantId: variant.id,
          qty: item.qty,
          costCents: item.costCents,
        },
      });

      await tx.inventoryMovement.create({
        data: {
          businessId: ctx.businessId,
          branchId: ctx.branchId,
          userId: ctx.userId,
          productId: variant.productId,
          variantId: variant.id,
          type: "PURCHASE",
          qty: item.qty,
          reason: `Compra ${purchase.id}`,
        },
      });

      // Defense-in-depth: purchases only increment stock, so they never cross
      // below the threshold — kept uniform with sales/imports (design).
      emitLowStockIfCrossed(
        variant.stock - item.qty,
        variant.stock,
        variant.productId,
        variant.product.name,
        ctx.branchId,
        ctx.businessId,
      );
    }

    await tx.purchase.update({ where: { id: purchase.id }, data: { totalCents } });

    emit("inventory.changed", { purchaseId: purchase.id }, ctx.branchId, ctx.businessId);

    return { ...purchase, totalCents };
  });
}
