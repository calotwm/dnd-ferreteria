import type { PrismaClient } from "@prisma/client";

export interface MovementCtx {
  businessId: string;
  branchId: string;
  userId: string;
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
