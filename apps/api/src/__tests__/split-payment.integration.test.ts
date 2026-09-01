import { describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma.js";

/**
 * Integration test for split/mixed payments. Requires a dedicated test
 * PostgreSQL database (TEST_DATABASE_URL). Skipped in unit runs — exercised
 * during verification (in-cloud against Railway Postgres, no Docker).
 */
const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasTestDb)("split/mixed payment (integration)", () => {
  it("records one Payment row per split amount", async () => {
    const business = await prisma.business.create({ data: { name: "T", currency: "ARS" } });
    const branch = await prisma.branch.create({ data: { businessId: business.id, name: "B" } });
    const product = await prisma.product.create({
      data: { businessId: business.id, name: "P", priceCents: 10000 },
    });
    const variant = await prisma.variant.create({
      data: { productId: product.id, stock: 10, priceCents: 10000 },
    });
    const user = await prisma.user.create({
      data: {
        businessId: business.id,
        branchId: branch.id,
        name: "T",
        email: `t-${Date.now()}@x.com`,
        passwordHash: "x",
        role: "SELLER",
      },
    });

    const { createSale } = await import("../services/saleService.js");

    const result = await createSale(
      {
        items: [{ variantId: variant.id, qty: 1, unitPriceCents: 10000 }],
        payments: [
          { method: "EFECTIVO", amountCents: 6000 },
          { method: "TARJETA", amountCents: 4000 },
        ],
        discount: null,
        customerId: null,
      },
      { businessId: business.id, branchId: branch.id, sellerId: user.id },
    );

    const payments = await prisma.payment.findMany({ where: { saleId: result.sale.id } });
    expect(payments).toHaveLength(2);
    expect(payments.reduce((s, p) => s + Number(p.amountCents), 0)).toBe(10000);
  });

  it("creates a debt for the fiado portion only in a mixed payment", async () => {
    const business = await prisma.business.create({ data: { name: "T2", currency: "ARS" } });
    const branch = await prisma.branch.create({ data: { businessId: business.id, name: "B" } });
    const customer = await prisma.customer.create({
      data: { businessId: business.id, name: "Cliente" },
    });
    const product = await prisma.product.create({
      data: { businessId: business.id, name: "P", priceCents: 10000 },
    });
    const variant = await prisma.variant.create({
      data: { productId: product.id, stock: 10, priceCents: 10000 },
    });
    const user = await prisma.user.create({
      data: {
        businessId: business.id,
        branchId: branch.id,
        name: "T",
        email: `t-${Date.now()}@x.com`,
        passwordHash: "x",
        role: "SELLER",
      },
    });

    const { createSale } = await import("../services/saleService.js");

    const result = await createSale(
      {
        items: [{ variantId: variant.id, qty: 1, unitPriceCents: 10000 }],
        payments: [
          { method: "EFECTIVO", amountCents: 7000 },
          { method: "FIADO", amountCents: 3000 },
        ],
        discount: null,
        customerId: customer.id,
      },
      { businessId: business.id, branchId: branch.id, sellerId: user.id },
    );

    const debt = await prisma.debt.findUnique({ where: { id: result.debtId! } });
    expect(Number(debt?.totalCents)).toBe(3000);
    expect(Number(debt?.remainingCents)).toBe(3000);
  });

  it("rejects a sale whose payments do not sum to the total, leaving stock intact", async () => {
    const business = await prisma.business.create({ data: { name: "T3", currency: "ARS" } });
    const branch = await prisma.branch.create({ data: { businessId: business.id, name: "B" } });
    const product = await prisma.product.create({
      data: { businessId: business.id, name: "P", priceCents: 10000 },
    });
    const variant = await prisma.variant.create({
      data: { productId: product.id, stock: 10, priceCents: 10000 },
    });
    const user = await prisma.user.create({
      data: {
        businessId: business.id,
        branchId: branch.id,
        name: "T",
        email: `t-${Date.now()}@x.com`,
        passwordHash: "x",
        role: "SELLER",
      },
    });

    const { createSale } = await import("../services/saleService.js");

    await expect(
      createSale(
        {
          items: [{ variantId: variant.id, qty: 1, unitPriceCents: 10000 }],
          payments: [{ method: "EFECTIVO", amountCents: 6000 }],
          discount: null,
          customerId: null,
        },
        { businessId: business.id, branchId: branch.id, sellerId: user.id },
      ),
    ).rejects.toThrow(/does not equal/);

    const after = await prisma.variant.findUnique({ where: { id: variant.id } });
    expect(after?.stock).toBe(10);
  });
});
