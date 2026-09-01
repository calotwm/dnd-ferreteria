import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { emit } from "../lib/socket.js";
import {
  computeTotals,
  crossedBelowThreshold,
  validatePaymentsSum,
  type SaleDiscount,
  type SaleItemInput,
} from "@dnd/shared";

export type PaymentMethod = "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "FIADO";

export interface PaymentInput {
  method: PaymentMethod;
  amountCents: number;
}

export interface CreateSaleInput {
  items: SaleItemInput[];
  /** Canonical: multiple payments whose sum must equal the post-discount total. */
  payments?: PaymentInput[];
  /** Legacy single-payment fields (kept for backward compatibility). */
  paymentMethod?: PaymentMethod;
  amountCents?: number;
  discount: SaleDiscount | null;
  customerId: string | null;
}

export interface SaleContext {
  businessId: string;
  branchId: string;
  sellerId: string;
}

export { computeTotals };

/** Resolve canonical `payments[]` from the new array or the legacy single-payment fields. */
function resolvePayments(input: CreateSaleInput, totalCents: number): PaymentInput[] {
  if (input.payments && input.payments.length > 0) {
    return input.payments;
  }
  if (input.paymentMethod === undefined) {
    throw new Error("Payments required");
  }
  // Legacy fallback: a single payment. For FIADO the old code forced the full
  // total; keep that exact behavior so existing callers stay green.
  const amountCents = input.paymentMethod === "FIADO" ? totalCents : (input.amountCents ?? totalCents);
  return [{ method: input.paymentMethod, amountCents }];
}

/**
 * Create a sale and deduct stock atomically. Row locks (`SELECT ... FOR UPDATE`)
 * guarantee no oversell under concurrency. A sale is rejected when any variant
 * lacks sufficient stock or when payments do not sum to the total, leaving
 * stock unchanged (spec: pos/integrity).
 */
export async function createSale(input: CreateSaleInput, ctx: SaleContext) {
  const { subtotalCents, discountCents, totalCents } = computeTotals(input.items, input.discount);

  return prisma.$transaction(async (tx) => {
    const payments = resolvePayments(input, totalCents);

    // Authoritative check: payments must sum EXACTLY to the post-discount total
    // (integer cents). Reject otherwise (spec: pos/payment methods).
    const validation = validatePaymentsSum(payments, totalCents);
    if (!validation.ok) {
      throw new Error(validation.error);
    }

    // 1. Lock variant rows in a deterministic order to avoid deadlocks.
    const variantIds = [...new Set(input.items.map((i) => i.variantId))].sort();
    const locked = await tx.$queryRaw<Array<{ id: string; stock: number }>>(
      Prisma.sql`SELECT id, stock FROM "Variant" WHERE id IN (${Prisma.join(variantIds)}) FOR UPDATE`,
    );
    const stockById = new Map(locked.map((r) => [r.id, r.stock]));

    // 2. Validate stock before any write.
    for (const item of input.items) {
      const stock = stockById.get(item.variantId);
      if (stock === undefined) {
        throw new Error(`Variant ${item.variantId} not found`);
      }
      if (stock < item.qty) {
        throw new Error(`Insufficient stock for variant ${item.variantId}: have ${stock}, need ${item.qty}`);
      }
    }

    // 3. Create the sale.
    const sale = await tx.sale.create({
      data: {
        businessId: ctx.businessId,
        branchId: ctx.branchId,
        sellerId: ctx.sellerId,
        customerId: input.customerId,
        totalCents,
        discountCents,
      },
    });

    // 4. Sale items + stock decrement + inventory movement (atomic, same tx).
    for (const item of input.items) {
      const before = stockById.get(item.variantId)!;
      const after = before - item.qty;

      const variant = await tx.variant.update({
        where: { id: item.variantId },
        data: { stock: { decrement: item.qty } },
      });

      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          productId: variant.productId,
          variantId: variant.id,
          qty: item.qty,
          unitPriceCents: item.unitPriceCents,
        },
      });

      await tx.inventoryMovement.create({
        data: {
          businessId: ctx.businessId,
          branchId: ctx.branchId,
          productId: variant.productId,
          variantId: variant.id,
          type: "SALE",
          qty: -item.qty,
          userId: ctx.sellerId,
          reason: `Venta ${sale.id}`,
        },
      });

      // Low-stock alert: emit only on the downward crossing (< threshold), never
      // per-unit while already below (spec: platform/low-stock emission).
      if (crossedBelowThreshold(before, after)) {
        const product = await tx.product.findUnique({
          where: { id: variant.productId },
          select: { name: true },
        });
        emit(
          "low_stock",
          { productId: variant.productId, name: product?.name ?? "", stock: after },
          ctx.branchId,
          ctx.businessId,
        );
      }
    }

    // 5. Payments — one row per method/amount (split payment support).
    const createdPayments = await Promise.all(
      payments.map((p) =>
        tx.payment.create({
          data: { saleId: sale.id, method: p.method, amountCents: p.amountCents },
        }),
      ),
    );

    // 6. Fiado → debt for the FIADO portion only (not the whole total).
    const fiadoPortion = payments
      .filter((p) => p.method === "FIADO")
      .reduce((sum, p) => sum + p.amountCents, 0);

    let debtId: string | null = null;
    if (fiadoPortion > 0) {
      if (!input.customerId) {
        throw new Error("Fiado requires a customer");
      }
      const debt = await tx.debt.create({
        data: {
          businessId: ctx.businessId,
          customerId: input.customerId,
          saleId: sale.id,
          totalCents: fiadoPortion,
          remainingCents: fiadoPortion,
          dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      debtId = debt.id;
    }

    // 7. Receipt (comprobante no fiscal).
    const number = `R-${Date.now().toString(36).toUpperCase()}-${sale.id.slice(-4).toUpperCase()}`;
    const receipt = await tx.receipt.create({
      data: { saleId: sale.id, number, totalCents },
    });

    // 8. Cash movement for the EFECTIVO portion (not the total).
    const efectivoPortion = payments
      .filter((p) => p.method === "EFECTIVO")
      .reduce((sum, p) => sum + p.amountCents, 0);

    if (efectivoPortion > 0) {
      const session = await tx.cashSession.findFirst({
        where: { branchId: ctx.branchId, closedAt: null },
        orderBy: { openedAt: "desc" },
      });
      if (session) {
        await tx.cashMovement.create({
          data: {
            sessionId: session.id,
            branchId: ctx.branchId,
            userId: ctx.sellerId,
            type: "SALE_IN",
            amountCents: efectivoPortion,
          },
        });
      }
    }

    emit("sale.created", { saleId: sale.id, totalCents }, ctx.branchId, ctx.businessId);
    emit("inventory.changed", { saleId: sale.id }, ctx.branchId, ctx.businessId);
    if (debtId) {
      emit("fiado.paid", { debtId }, ctx.branchId, ctx.businessId);
    }

    return { sale, payments: createdPayments, receipt, debtId, subtotalCents, discountCents, totalCents };
  });
}
