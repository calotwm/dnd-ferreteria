import type { PrismaClient } from "@prisma/client";
import { crossedBelowThreshold } from "@dnd/shared";
import { emit } from "../lib/socket.js";

export interface MovementCtx {
  businessId: string;
  branchId: string;
  userId: string;
}

/**
 * Emit a `low_stock` event only when a mutation crosses below the threshold.
 * Purchase/import only increment stock, so this never fires there — it is kept
 * uniform with the sale path as defense-in-depth (spec: platform/low-stock).
 */
export function emitLowStockIfCrossed(
  before: number,
  after: number,
  productId: string,
  name: string,
  branchId?: string,
  businessId?: string,
): void {
  if (crossedBelowThreshold(before, after)) {
    emit("low_stock", { productId, name, stock: after }, branchId, businessId);
  }
}

/**
 * Append an inventory movement (append-only ledger). Every stock change MUST
 * go through here so the audit trail is complete (spec: platform/audit).
 */
export async function recordInventoryMovement(
  tx: PrismaClient,
  ctx: MovementCtx,
  args: {
    productId: string;
    variantId: string | null;
    type: "SALE" | "PURCHASE" | "ADJUSTMENT" | "RETURN";
    qty: number;
    reason?: string;
  },
) {
  return tx.inventoryMovement.create({
    data: {
      businessId: ctx.businessId,
      branchId: ctx.branchId,
      userId: ctx.userId,
      productId: args.productId,
      variantId: args.variantId,
      type: args.type,
      qty: args.qty,
      reason: args.reason,
    },
  });
}
